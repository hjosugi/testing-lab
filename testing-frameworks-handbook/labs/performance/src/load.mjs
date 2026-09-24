// Open-model (arrival-rate) and closed-model load generation over real HTTP.
// Latency in the open model is measured from the *intended* start time, so a
// stalled server is charged for every request it prevented from being sent
// (coordinated-omission correction). The closed model is kept only to show
// what a naive "send, wait, send" client under-reports.
import http from 'node:http';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { cpus, platform, arch, release } from 'node:os';

export function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sortedValues.length));
  return sortedValues[Math.min(rank, sortedValues.length) - 1];
}

export function summarize(values) {
  const sorted = Float64Array.from(values).sort();
  const round = value => (value === null ? null : Math.round(value * 100) / 100);
  return {
    count: sorted.length,
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    max: round(sorted.length ? sorted[sorted.length - 1] : null),
  };
}

// Log-bucketed histogram (1 ms .. ~65 s, 8 sub-buckets per power of two) for
// artifacts; percentiles above are exact because CI-sized runs are small.
export function histogram(values) {
  const buckets = new Map();
  for (const value of values) {
    const exponent = Math.floor(Math.log2(Math.max(value, 1)));
    const base = 2 ** exponent;
    const sub = Math.min(7, Math.floor(((Math.max(value, 1) - base) / base) * 8));
    const lower = Math.round((base + (sub * base) / 8) * 100) / 100;
    buckets.set(lower, (buckets.get(lower) ?? 0) + 1);
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([lowerMs, count]) => ({ lowerMs, count }));
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Arrival schedule in ms offsets. `phases` lets spike/capacity profiles change
// the rate over time: [{ rate, durationMs }, ...].
export function arrivalSchedule({ phases, arrival = 'constant', seed = 1 }) {
  const random = mulberry32(seed);
  const offsets = [];
  const phaseOf = [];
  let phaseStart = 0;
  phases.forEach((phase, index) => {
    const end = phaseStart + phase.durationMs;
    let t = phaseStart;
    const meanGap = 1000 / phase.rate;
    while (true) {
      t += arrival === 'poisson' ? -Math.log(1 - random()) * meanGap : meanGap;
      if (t >= end) break;
      offsets.push(t);
      phaseOf.push(index);
    }
    phaseStart = end;
  });
  return { offsets, phaseOf, durationMs: phaseStart };
}

export function environmentFingerprint() {
  return {
    node: process.version,
    platform: platform(),
    arch: arch(),
    kernel: release(),
    cpuModel: cpus()[0]?.model ?? 'unknown',
    cpuCount: cpus().length,
    ci: Boolean(process.env.CI),
  };
}

function send(agent, url, body) {
  return new Promise(resolve => {
    const request = http.request(url, { method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, response => {
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode }));
    });
    request.on('error', error => resolve({ status: 0, error: error.code ?? error.message }));
    request.end(body);
  });
}

const BODY = JSON.stringify([{ sku: 'book', quantity: 2, unitPrice: 600 }, { sku: 'pen', quantity: 3, unitPrice: 120 }]);

export async function runOpenModel({ url, phases, arrival = 'constant', seed = 1, warmupMs = 0, sampleSaturation = () => null, windowMs = 250 }) {
  const schedule = arrivalSchedule({ phases, arrival, seed });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 512 });
  const loopDelay = monitorEventLoopDelay({ resolution: 5 });
  loopDelay.enable();
  const samples = [];
  const saturation = [];
  const start = performance.now();
  const sampler = setInterval(() => {
    const value = sampleSaturation();
    if (value) saturation.push({ atMs: Math.round(performance.now() - start), ...value });
  }, 100);

  const inFlight = [];
  for (let index = 0; index < schedule.offsets.length; index += 1) {
    const intended = start + schedule.offsets[index];
    const wait = intended - performance.now();
    if (wait > 1) await new Promise(resolve => setTimeout(resolve, wait));
    const sentAt = performance.now();
    inFlight.push(send(agent, url, BODY).then(result => {
      const done = performance.now();
      samples.push({
        offsetMs: schedule.offsets[index],
        phase: schedule.phaseOf[index],
        status: result.status,
        latencyMs: done - intended,
        serviceMs: done - sentAt,
        lagMs: sentAt - intended,
      });
    }));
  }
  await Promise.all(inFlight);
  clearInterval(sampler);
  loopDelay.disable();
  agent.destroy();
  const elapsedMs = performance.now() - start;
  return { model: 'open', arrival, seed, schedule, samples, saturation, elapsedMs, warmupMs, windowMs, eventLoopDelayP99Ms: loopDelay.percentile(99) / 1e6 };
}

// Naive closed model: `users` loops, each sends the next request only after
// the previous response, for `durationMs`. Latency is measured from send.
export async function runClosedModel({ url, users = 1, durationMs, thinkMs = 10 }) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: users });
  const samples = [];
  const start = performance.now();
  await Promise.all(Array.from({ length: users }, async () => {
    while (performance.now() - start < durationMs) {
      const sentAt = performance.now();
      const result = await send(agent, url, BODY);
      samples.push({ offsetMs: sentAt - start, status: result.status, latencyMs: performance.now() - sentAt });
      await new Promise(resolve => setTimeout(resolve, thinkMs));
    }
  }));
  agent.destroy();
  return { model: 'closed', samples, elapsedMs: performance.now() - start };
}

export function analyze(run, { lagBudgetMs = 30 } = {}) {
  const measured = run.samples.filter(sample => sample.offsetMs >= (run.warmupMs ?? 0));
  const ok = measured.filter(sample => sample.status === 200);
  const errors = {};
  for (const sample of measured) if (sample.status !== 200) errors[sample.status] = (errors[sample.status] ?? 0) + 1;
  const measuredSeconds = Math.max(1e-9, (run.elapsedMs - (run.warmupMs ?? 0)) / 1000);
  const lag = summarize(measured.map(sample => sample.lagMs ?? 0));
  return {
    model: run.model,
    requests: measured.length,
    warmupRequestsDiscarded: run.samples.length - measured.length,
    throughputPerSecond: Math.round((ok.length / measuredSeconds) * 10) / 10,
    errorRate: measured.length === 0 ? 0 : (measured.length - ok.length) / measured.length,
    errors,
    latencyMs: summarize(ok.map(sample => sample.latencyMs)),
    serviceTimeMs: run.model === 'open' ? summarize(ok.map(sample => sample.serviceMs)) : undefined,
    generatorLagMs: run.model === 'open' ? lag : undefined,
    // If the generator itself could not send on time, the run measured the
    // client, not the system; results are marked invalid instead of passing.
    clientBottleneck: run.model === 'open' ? (lag.p99 ?? 0) > lagBudgetMs : undefined,
    histogram: histogram(ok.map(sample => sample.latencyMs)),
  };
}

// Per-window p99 series for spike recovery and soak trend analysis.
export function windows(run, windowMs = run.windowMs ?? 250) {
  const buckets = new Map();
  for (const sample of run.samples) {
    const key = Math.floor(sample.offsetMs / windowMs);
    const bucket = buckets.get(key) ?? [];
    bucket.push(sample);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([key, bucket]) => ({
    startMs: key * windowMs,
    requests: bucket.length,
    errorRate: bucket.filter(sample => sample.status !== 200).length / bucket.length,
    p99: summarize(bucket.filter(sample => sample.status === 200).map(sample => sample.latencyMs)).p99,
  }));
}

// Least-squares slope (units per second) for soak trend checks.
export function slopePerSecond(points, key) {
  if (points.length < 2) return 0;
  const xs = points.map(point => point.atMs / 1000);
  const ys = points.map(point => point[key]);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}
