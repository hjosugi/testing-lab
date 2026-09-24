// CI-sized load/stress/spike/soak/capacity profiles over real HTTP. Each
// profile answers a different question; durations are seconds, not hours, so
// these prove the method and the oracles, not production capacity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTargetServer } from '../src/target-server.mjs';
import { analyze, runClosedModel, runOpenModel, windows } from '../src/load.mjs';
import {
  capacityReport, evaluateSlo, record, recoveryMs, saturationProbe, SLO, soakVerdict,
} from '../src/profiles.mjs';

// 8 workers x 40ms service time = 200 req/s modeled capacity. A long service
// time keeps timer jitter on shared CI runners small relative to the model.
const TARGET = Object.freeze({ workers: 8, serviceMs: 40, queueLimit: 32 });

// When the generator itself misses its arrival schedule, the host measured
// itself, not the service: every latency oracle below would be a false claim
// in either direction. Such runs are reported as inconclusive (skip) unless
// PERF_REQUIRE_CONCLUSIVE=1, which the dedicated CI performance job sets.
function conclusive(t, analysis) {
  if (!analysis.clientBottleneck) return true;
  const reason = `inconclusive: load generator lag p99 ${analysis.generatorLagMs.p99}ms exceeds its budget`;
  if (process.env.PERF_REQUIRE_CONCLUSIVE === '1') assert.fail(reason);
  t.skip(reason);
  return false;
}

async function withTarget(options, body) {
  const target = createTargetServer(options);
  const url = `${await target.listen()}/quote`;
  try {
    return await body(target, url);
  } finally {
    await target.close();
  }
}

test('load: normal workload (50% of capacity) meets the SLO after warm-up', async t => {
  await withTarget(TARGET, async (target, url) => {
    const rate = target.capacityPerSecond * SLO.normalLoadFraction;
    const run = await runOpenModel({ url, phases: [{ rate, durationMs: 3000 }], arrival: 'poisson', seed: 20260925, warmupMs: 500, sampleSaturation: saturationProbe(target) });
    const result = record({ kind: 'load', target, run });
    t.diagnostic(`p50/p95/p99=${result.analysis.latencyMs.p50}/${result.analysis.latencyMs.p95}/${result.analysis.latencyMs.p99}ms, generator lag p99=${result.analysis.generatorLagMs.p99}ms`);
    if (!conclusive(t, result.analysis)) return;
    const verdict = evaluateSlo(result);
    assert.equal(verdict.met, true, verdict.violations.join('; '));
    assert.ok(result.analysis.warmupRequestsDiscarded > 0, 'warm-up requests are executed but not measured');
    assert.ok(result.saturation.peakUtilization <= 1);
    assert.ok(result.analysis.throughputPerSecond > rate * 0.8, `throughput ${result.analysis.throughputPerSecond}/s`);
  });
});

test('coordinated omission: a 400ms stall is visible only when latency starts at the intended send time', async t => {
  const stallAtMs = 1500;
  const measure = async model => withTarget({ workers: 4, serviceMs: 5 }, async (target, url) => {
    setTimeout(() => target.stall(400), stallAtMs);
    return model === 'open'
      ? analyze(await runOpenModel({ url, phases: [{ rate: 100, durationMs: 3000 }], warmupMs: 300 }))
      : analyze(await runClosedModel({ url, users: 1, durationMs: 3000, thinkMs: 10 }));
  });
  const open = await measure('open');
  if (!conclusive(t, open)) return;
  const closed = await measure('closed');

  assert.ok(closed.latencyMs.max >= 350, `closed client saw the stall once (max ${closed.latencyMs.max}ms)`);
  assert.ok(closed.latencyMs.p99 < 100, `closed p99 hides it: ${closed.latencyMs.p99}ms`);
  assert.ok(open.latencyMs.p99 >= 250, `open p99 charges every delayed arrival: ${open.latencyMs.p99}ms`);
  assert.ok(open.requests > closed.requests, 'the closed client silently sent fewer requests during the stall');
});

test('stress: above capacity the service sheds with 503, keeps accepted latency bounded, and recovers', async t => {
  await withTarget(TARGET, async (target, url) => {
    const capacity = target.capacityPerSecond;
    const run = await runOpenModel({
      url,
      phases: [{ rate: capacity * 1.5, durationMs: 2000 }, { rate: capacity * 0.5, durationMs: 1500 }],
      warmupMs: 0,
      sampleSaturation: saturationProbe(target),
    });
    if (!conclusive(t, analyze(run))) return;
    const overload = analyze({ ...run, samples: run.samples.filter(sample => sample.phase === 0) });
    const statuses = Object.keys(overload.errors);
    assert.deepEqual(statuses, ['503'], `only admission-control rejections, got ${JSON.stringify(overload.errors)}`);
    assert.ok(overload.errorRate > 0.1, `shed ${(overload.errorRate * 100).toFixed(1)}%`);
    const queueBoundMs = (TARGET.queueLimit / TARGET.workers) * TARGET.serviceMs + TARGET.serviceMs;
    assert.ok(overload.latencyMs.p99 <= queueBoundMs * 1.5 + 50, `accepted p99 ${overload.latencyMs.p99}ms stays near the ${queueBoundMs}ms queue bound`);
    const tail = windows(run).filter(window => window.startMs >= 2750);
    assert.ok(tail.length > 0 && tail.every(window => window.errorRate === 0), 'no shedding once load returns to normal');
  });
});

test('spike: a 3x burst is absorbed or shed and p99 returns within the SLO in under 1s', async t => {
  await withTarget(TARGET, async (target, url) => {
    const capacity = target.capacityPerSecond;
    const run = await runOpenModel({
      url,
      phases: [{ rate: capacity * 0.25, durationMs: 1000 }, { rate: capacity * 3, durationMs: 400 }, { rate: capacity * 0.25, durationMs: 2000 }],
      warmupMs: 0,
    });
    if (!conclusive(t, analyze(run))) return;
    const recovery = recoveryMs(run, { spikeEndMs: 1400 });
    assert.notEqual(recovery, null, 'service recovered');
    assert.ok(recovery < 1000, `recovered after ${recovery}ms`);
  });
});

test('soak: steady load shows no queue or memory trend; injected leak and backlog are flagged', async t => {
  const soak = options => withTarget(options.server, async (target, url) => {
    const run = await runOpenModel({ url, phases: [{ rate: options.rate(target), durationMs: 3000 }], warmupMs: 500, sampleSaturation: saturationProbe(target) });
    const result = record({ kind: 'soak', target, run });
    return { ...soakVerdict(result), analysis: result.analysis };
  });

  const steady = await soak({ server: TARGET, rate: target => target.capacityPerSecond * 0.5 });
  if (!conclusive(t, steady.analysis)) return;
  assert.deepEqual({ steady: steady.steady, findings: steady.findings }, { steady: true, findings: [] });

  const leaking = await soak({ server: { ...TARGET, leakBytesPerRequest: 4096 }, rate: target => target.capacityPerSecond * 0.5 });
  assert.equal(leaking.steady, false);
  assert.match(leaking.findings.join(), /retained memory grows/);

  const backlog = await soak({ server: { ...TARGET, queueLimit: 10_000 }, rate: target => target.capacityPerSecond * 1.15 });
  assert.equal(backlog.steady, false);
  assert.match(backlog.findings.join(), /queue buildup/);
});

test('capacity: step load finds the limit near the modeled capacity and documents the degradation mode', async t => {
  await withTarget(TARGET, async (target, url) => {
    const steps = [0.25, 0.5, 0.75, 1.25, 1.5].map(fraction => ({ rate: target.capacityPerSecond * fraction, durationMs: 1000 }));
    const run = await runOpenModel({ url, phases: steps, warmupMs: 0 });
    if (!conclusive(t, analyze(run))) return;
    const report = capacityReport(run, steps);
    assert.ok(report.capacityLimitPerSecond >= target.capacityPerSecond * 0.5, JSON.stringify(report.steps));
    assert.ok(report.capacityLimitPerSecond <= target.capacityPerSecond, JSON.stringify(report.steps));
    assert.deepEqual(report.degradation.at(-1), { rate: target.capacityPerSecond * 1.5, mode: 'sheds with 503 (bounded queue)' });
  });
});
