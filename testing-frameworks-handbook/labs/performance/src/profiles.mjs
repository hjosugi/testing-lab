// Five load profiles with different questions, one SLO, and one evaluation
// that refuses evidence which cannot support a performance claim.
import { analyze, environmentFingerprint, slopePerSecond, windows } from './load.mjs';

export const SLO = Object.freeze({
  name: 'checkout-quote',
  // Workload model: POST /quote with a 2-line cart, constant or Poisson
  // arrivals, at the "normal" rate of 50% of modeled capacity.
  normalLoadFraction: 0.5,
  p95Ms: 80,
  p99Ms: 150,
  maxErrorRate: 0.001,
});

export const PROFILE_KINDS = Object.freeze(['load', 'stress', 'spike', 'soak', 'capacity']);

export function evaluateSlo(result, slo = SLO) {
  if (!PROFILE_KINDS.includes(result.kind)) {
    throw new TypeError(`${result.kind ?? 'unknown'} results cannot support an SLO claim; use a load profile, not functional E2E timing`);
  }
  if (result.analysis.model !== 'open') throw new TypeError('closed-model latency hides coordinated omission and cannot support an SLO claim');
  if (result.warmupMs <= 0) throw new TypeError('SLO evaluation requires a warm-up window that is excluded from measurement');
  const { latencyMs, errorRate, clientBottleneck } = result.analysis;
  const violations = [];
  if (clientBottleneck) violations.push('load generator could not keep the arrival schedule (client bottleneck); result is invalid');
  if (latencyMs.p95 === null || latencyMs.p95 > slo.p95Ms) violations.push(`p95 ${latencyMs.p95}ms > ${slo.p95Ms}ms`);
  if (latencyMs.p99 === null || latencyMs.p99 > slo.p99Ms) violations.push(`p99 ${latencyMs.p99}ms > ${slo.p99Ms}ms`);
  if (errorRate > slo.maxErrorRate) violations.push(`error rate ${(errorRate * 100).toFixed(2)}% > ${slo.maxErrorRate * 100}%`);
  return { met: violations.length === 0, violations };
}

export function record({ kind, target, run, extra = {} }) {
  const analysis = analyze(run);
  return {
    kind,
    recordedAt: new Date().toISOString(),
    environment: environmentFingerprint(),
    target: { workers: target.stats().workers, serviceMs: target.stats().serviceMs, queueLimit: target.stats().queueLimit, modeledCapacityPerSecond: target.capacityPerSecond },
    arrival: run.arrival,
    seed: run.seed,
    warmupMs: run.warmupMs,
    durationMs: run.schedule.durationMs,
    analysis,
    saturation: summarizeSaturation(run.saturation, target.stats()),
    eventLoopDelayP99Ms: Math.round(run.eventLoopDelayP99Ms * 100) / 100,
    ...extra,
  };
}

function summarizeSaturation(points, finalStats) {
  const peak = key => points.reduce((max, point) => Math.max(max, point[key]), 0);
  return {
    samples: points.length,
    peakQueueDepth: peak('queueDepth'),
    peakUtilization: Math.round(peak('utilization') * 100) / 100,
    shed: finalStats.shed,
    queueDepthSlopePerSecond: Math.round(slopePerSecond(points, 'queueDepth') * 100) / 100,
    retainedBytesSlopePerSecond: Math.round(slopePerSecond(points, 'retainedBytes')),
  };
}

export const saturationProbe = target => () => {
  const stats = target.stats();
  return { queueDepth: stats.queueDepth, utilization: stats.busy / stats.workers, retainedBytes: stats.retainedBytes };
};

// Spike recovery: first window after the spike whose p99 is back within the
// SLO and has no shed requests.
export function recoveryMs(run, { spikeEndMs, slo = SLO }) {
  const series = windows(run);
  const recovered = series.find(window => window.startMs >= spikeEndMs && window.errorRate === 0 && window.p99 !== null && window.p99 <= slo.p99Ms);
  return recovered ? recovered.startMs - spikeEndMs : null;
}

// Capacity: highest step whose own window meets the SLO. Steps above it
// document the degradation mode (shedding vs. unbounded latency).
export function capacityReport(run, steps, slo = SLO) {
  const perStep = steps.map((step, index) => {
    const samples = run.samples.filter(sample => sample.phase === index);
    const stepRun = { ...run, samples, warmupMs: 0, elapsedMs: step.durationMs };
    const analysis = analyze(stepRun);
    return {
      rate: step.rate,
      p99Ms: analysis.latencyMs.p99,
      errorRate: Math.round(analysis.errorRate * 1000) / 1000,
      throughputPerSecond: analysis.throughputPerSecond,
      meetsSlo: analysis.errorRate <= slo.maxErrorRate && analysis.latencyMs.p99 !== null && analysis.latencyMs.p99 <= slo.p99Ms,
    };
  });
  const passing = perStep.filter(step => step.meetsSlo);
  return {
    steps: perStep,
    capacityLimitPerSecond: passing.length === 0 ? 0 : Math.max(...passing.map(step => step.rate)),
    degradation: perStep.filter(step => !step.meetsSlo).map(step => ({
      rate: step.rate,
      mode: step.errorRate > slo.maxErrorRate ? 'sheds with 503 (bounded queue)' : 'latency above SLO without errors',
    })),
  };
}

// Soak verdict: queue depth or retained memory growing over time means the
// system is not in steady state even if the whole-run percentiles look fine.
export function soakVerdict(result, { maxQueueSlope = 0.5, maxRetainedBytesSlope = 50_000 } = {}) {
  const findings = [];
  if (result.saturation.queueDepthSlopePerSecond > maxQueueSlope) findings.push(`queue buildup ${result.saturation.queueDepthSlopePerSecond}/s`);
  if (result.saturation.retainedBytesSlopePerSecond > maxRetainedBytesSlope) findings.push(`retained memory grows ${result.saturation.retainedBytesSlopePerSecond} B/s`);
  return { steady: findings.length === 0, findings };
}

// Baselines are only comparable on the same environment fingerprint.
export function compareToBaseline(result, baseline, { tolerance = 0.25 } = {}) {
  const keys = ['node', 'platform', 'arch', 'cpuModel', 'cpuCount'];
  const mismatched = keys.filter(key => baseline.environment[key] !== result.environment[key]);
  if (mismatched.length > 0) return { comparable: false, reason: `environment differs: ${mismatched.join(', ')}` };
  const limit = baseline.analysis.latencyMs.p95 * (1 + tolerance);
  return {
    comparable: true,
    regressed: result.analysis.latencyMs.p95 > limit,
    baselineP95Ms: baseline.analysis.latencyMs.p95,
    currentP95Ms: result.analysis.latencyMs.p95,
    limitMs: Math.round(limit * 100) / 100,
  };
}

// Confidence from seeded repeats: the spread tells whether a p95 difference
// between two builds is larger than run-to-run noise on this environment.
export function repeatConfidence(results) {
  const p95s = results.map(result => result.analysis.latencyMs.p95).sort((a, b) => a - b);
  const median = p95s[Math.floor((p95s.length - 1) / 2)];
  return {
    repeats: p95s.length,
    p95Ms: { min: p95s[0], median, max: p95s.at(-1) },
    relativeSpread: Math.round(((p95s.at(-1) - p95s[0]) / median) * 100) / 100,
  };
}
