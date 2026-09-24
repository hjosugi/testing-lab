// Fast, timing-free checks of the measurement model itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivalSchedule, histogram, percentile, slopePerSecond, summarize } from '../src/load.mjs';
import { compareToBaseline, evaluateSlo, repeatConfidence, SLO } from '../src/profiles.mjs';

test('percentile: nearest-rank on sorted samples, empty input is null', () => {
  const sorted = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(percentile(sorted, 50), 5);
  assert.equal(percentile(sorted, 95), 10);
  assert.equal(percentile(sorted, 99), 10);
  assert.equal(percentile(new Float64Array(), 99), null);
  assert.deepEqual(summarize([3, 1, 2]), { count: 3, p50: 2, p95: 3, p99: 3, max: 3 });
});

test('histogram: log buckets keep every sample', () => {
  const values = [0.2, 1, 1.1, 9, 10, 250, 251];
  const buckets = histogram(values);
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.count, 0), values.length);
  assert.deepEqual(buckets.map(bucket => bucket.lowerMs), [...buckets.map(bucket => bucket.lowerMs)].sort((a, b) => a - b));
});

test('arrival schedule: constant rate is exact and phases change the rate', () => {
  const constant = arrivalSchedule({ phases: [{ rate: 100, durationMs: 1000 }] });
  assert.equal(constant.offsets.length, 99, 'arrivals at 10ms..990ms');
  const phased = arrivalSchedule({ phases: [{ rate: 10, durationMs: 1000 }, { rate: 100, durationMs: 500 }] });
  assert.equal(phased.phaseOf.filter(phase => phase === 0).length, 9);
  assert.equal(phased.phaseOf.filter(phase => phase === 1).length, 49);
  assert.equal(phased.durationMs, 1500);
});

test('arrival schedule: Poisson arrivals are reproducible from the seed', () => {
  const a = arrivalSchedule({ phases: [{ rate: 200, durationMs: 2000 }], arrival: 'poisson', seed: 7 });
  const b = arrivalSchedule({ phases: [{ rate: 200, durationMs: 2000 }], arrival: 'poisson', seed: 7 });
  const c = arrivalSchedule({ phases: [{ rate: 200, durationMs: 2000 }], arrival: 'poisson', seed: 8 });
  assert.deepEqual(a.offsets, b.offsets);
  assert.notDeepEqual(a.offsets, c.offsets);
  assert.ok(Math.abs(a.offsets.length - 400) < 80, `~400 arrivals, got ${a.offsets.length}`);
});

test('soak trend: least-squares slope detects growth, ignores flat noise', () => {
  const flat = Array.from({ length: 20 }, (_, i) => ({ atMs: i * 100, depth: i % 2 }));
  const growing = Array.from({ length: 20 }, (_, i) => ({ atMs: i * 100, depth: i }));
  assert.ok(Math.abs(slopePerSecond(flat, 'depth')) < 0.5);
  assert.equal(Math.round(slopePerSecond(growing, 'depth')), 10);
});

const fakeResult = overrides => ({
  kind: 'load',
  warmupMs: 500,
  environment: { node: 'v24', platform: 'linux', arch: 'x64', cpuModel: 'X', cpuCount: 4 },
  analysis: { model: 'open', latencyMs: { p95: 20, p99: 40 }, errorRate: 0, clientBottleneck: false },
  ...overrides,
});

test('SLO evaluation refuses functional E2E timing, closed-model latency, and missing warm-up', () => {
  assert.throws(() => evaluateSlo(fakeResult({ kind: 'playwright-e2e' })), /functional E2E timing/);
  assert.throws(() => evaluateSlo(fakeResult({ analysis: { ...fakeResult().analysis, model: 'closed' } })), /coordinated omission/);
  assert.throws(() => evaluateSlo(fakeResult({ warmupMs: 0 })), /warm-up/);
  assert.deepEqual(evaluateSlo(fakeResult()), { met: true, violations: [] });
});

test('SLO evaluation reports each violated objective and invalidates client-bound runs', () => {
  const verdict = evaluateSlo(fakeResult({
    analysis: { model: 'open', latencyMs: { p95: SLO.p95Ms + 1, p99: SLO.p99Ms + 1 }, errorRate: 0.01, clientBottleneck: true },
  }));
  assert.equal(verdict.met, false);
  assert.equal(verdict.violations.length, 4);
  assert.match(verdict.violations[0], /client bottleneck/);
});

test('baseline comparison is refused across environments and flags >25% p95 regressions', () => {
  const baseline = fakeResult();
  assert.deepEqual(compareToBaseline(fakeResult({ environment: { ...baseline.environment, cpuCount: 8 } }), baseline),
    { comparable: false, reason: 'environment differs: cpuCount' });
  const regressed = compareToBaseline(fakeResult({ analysis: { ...baseline.analysis, latencyMs: { p95: 26, p99: 40 } } }), baseline);
  assert.equal(regressed.regressed, true);
  assert.equal(compareToBaseline(fakeResult(), baseline).regressed, false);
});

test('repeat confidence summarizes the spread of p95 across seeded repeats', () => {
  const results = [18, 20, 30].map(p95 => fakeResult({ analysis: { ...fakeResult().analysis, latencyMs: { p95, p99: 50 } } }));
  assert.deepEqual(repeatConfidence(results), { repeats: 3, p95Ms: { min: 18, median: 20, max: 30 }, relativeSpread: 0.6 });
});
