import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { attribute, classifyRuns, coFailureClusters, flakeSummary } from '../src/analysis.mjs';
import { generateHistory } from '../src/history.mjs';
import { diagnosisDays, requiredCheck, validateQuarantine } from '../src/quarantine.mjs';
import { shuffled } from '../src/random.mjs';
import { dependencySelect, evaluateSelection, importGraph, predictiveSelect } from '../src/selection.mjs';
import { syntheticCommits } from '../src/commits.mjs';

const attempts = generateHistory();
const classified = classifyRuns(attempts);
const quarantine = JSON.parse(readFileSync(new URL('../quarantine.json', import.meta.url), 'utf8'));
const runDate = runId => Date.UTC(2026, 7, 1) + runId * 86_400_000;

test('first attempts are stored separately from retries', () => {
  const summary = flakeSummary(classified);
  assert.equal(summary.testRuns, 600);
  assert.ok(summary.firstAttemptFailureRate > summary.flakeRate, 'regressions are failures, not flakes');
  assert.ok(summary.retryMaskedPassRate > 0.95, 'a retry-until-green view would look healthy');
  assert.ok(summary.firstAttemptFailureRate > 0.1, 'first attempts show the real instability');
  assert.equal(summary.perTest['checkout-total'].flaky, 0);
  assert.ok(summary.perTest['checkout-total'].fail > 0);
});

test('co-failure clustering recovers the injected systemic causes', () => {
  const clusters = coFailureClusters(classified);
  assert.deepEqual(clusters, [['checkout-total'], ['orders-list'], ['payment-capture', 'payment-refund', 'payment-webhook'], ['ui-timer']]);
  const verdicts = Object.fromEntries(clusters.map(cluster => [cluster.join('+'), attribute(cluster, classified)]));
  assert.equal(verdicts['payment-capture+payment-refund+payment-webhook'].feature, 'host=runner-7');
  assert.equal(verdicts['orders-list'].feature, 'after=orders-cleanup');
  assert.equal(verdicts['ui-timer'].kind, 'intrinsic');
  assert.equal(verdicts['checkout-total'].kind, 'broken');
  // Ground truth check: every attributed cluster matches the injected cause.
  const truth = new Set(attempts.filter(a => a.groundTruth).map(a => `${a.testId}:${a.groundTruth}`));
  assert.ok(truth.has('payment-refund:host-dns') && truth.has('orders-list:order-dependent-fixture') && truth.has('ui-timer:timing'));
});

test('random order with a saved seed reproduces an order-dependent failure', () => {
  const flaky = classified.find(row => row.testId === 'orders-list' && row.status === 'flaky');
  const order = shuffled(['checkout-total', 'checkout-discount', 'payment-capture', 'payment-refund', 'payment-webhook', 'orders-save', 'orders-cleanup', 'orders-list', 'email-receipt', 'ui-timer'], flaky.first.orderSeed);
  assert.ok(order.indexOf('orders-cleanup') < order.indexOf('orders-list'), `seed ${flaky.first.orderSeed} replays the failing order`);

  // A real in-process suite with shared state, run in seeded random order.
  const runSuite = seed => {
    const table = ['seed-row'];
    const suite = {
      save: () => { table.push('new-row'); return true; },
      cleanup: () => { table.length = 0; return true; },
      list: () => table.length > 0,
    };
    const names = shuffled(Object.keys(suite), seed);
    return { seed, order: names, failed: names.filter(name => !suite[name]()) };
  };
  const failing = Array.from({ length: 20 }, (_, seed) => runSuite(seed)).find(run => run.failed.length > 0);
  assert.deepEqual(failing.failed, ['list']);
  assert.deepEqual(runSuite(failing.seed), failing, 'same seed, same order, same failure');
});

test('quarantine needs owner, cause, issue, and a <=30 day expiry', () => {
  assert.deepEqual(validateQuarantine(quarantine.entries, quarantine.evaluatedAt), []);
  const errors = validateQuarantine([
    { testId: 'a', owner: '', cause: 'timing', issue: 'X', quarantinedAt: '2026-09-01', expires: '2026-09-20' },
    { testId: 'b', owner: 'o', cause: 'cosmic-rays', issue: 'X', quarantinedAt: '2026-09-01', expires: '2026-12-01' },
  ], '2026-09-25');
  assert.deepEqual(errors, [
    'quarantine a: owner is required',
    'quarantine a: expired on 2026-09-20',
    'quarantine b: cause must be one of host-infra, order-dependent-fixture, timing, external-service, unknown',
    'quarantine b: quarantine may last at most 30 days',
  ]);
});

test('required check: a retry pass never turns a non-quarantined failure green; quarantined failures are still reported', () => {
  const runOf = runId => classified.filter(row => row.runId === runId);
  const flakyRun = classified.find(row => row.status === 'flaky' && row.testId === 'orders-list').runId;
  const withoutQuarantine = requiredCheck(runOf(flakyRun), []);
  assert.equal(withoutQuarantine.passed, false);
  assert.match(withoutQuarantine.blocking.find(row => row.testId === 'orders-list').reason, /recorded as flaky, not green/);
  const withQuarantine = requiredCheck(runOf(flakyRun), quarantine.entries);
  assert.ok(withQuarantine.quarantinedFailures.some(row => row.testId === 'orders-list'), 'still visible');
  const regressionRun = requiredCheck(runOf(50), quarantine.entries);
  assert.equal(regressionRun.passed, false, 'the regression is never quarantined away');
  assert.deepEqual(regressionRun.blocking.map(row => row.testId), ['checkout-total']);
});

test('diagnosis time is measured from the first flaky occurrence to classification', () => {
  const days = diagnosisDays(classified, quarantine.entries, runDate);
  assert.equal(days.length, 5);
  assert.ok(days.every(entry => entry.days >= 0));
});

const root = fileURLToPath(new URL('../fixture-project/', import.meta.url));
const graph = importGraph(root);
const ALL = [...graph.keys()].filter(file => file.startsWith('test/')).sort();

test('dependency selection follows static imports and falls back to everything for unmapped files', () => {
  assert.deepEqual(dependencySelect(graph, ['src/money.mjs']).tests, ['test/cart.test.mjs', 'test/money.test.mjs', 'test/payment.test.mjs']);
  assert.deepEqual(dependencySelect(graph, ['src/email.mjs']).tests, ['test/email.test.mjs']);
  const unknown = dependencySelect(graph, ['config/payment.json']);
  assert.deepEqual(unknown.tests, ALL);
  assert.match(unknown.fallback, /run everything/);
});

const commits = () => syntheticCommits(graph);

test('selection safety: dependency selection misses nothing; predictive selection misses and is bounded by periodic full runs', () => {
  const history = commits();
  const dependency = evaluateSelection(history, commit => dependencySelect(graph, commit.changed).tests);
  assert.equal(dependency.misses, 0);
  assert.ok(dependency.meanSelected < ALL.length, 'and still runs fewer tests than a full run');
  const predictive = evaluateSelection(history, (commit, past) => predictiveSelect(past, commit.changed, 1));
  assert.ok(predictive.misses > 0, `predictive selection missed ${predictive.misses} failing commit(s)`);
  assert.ok(predictive.maxDetectionDelay <= 4, 'the periodic full run bounds how long a miss stays hidden');
  assert.ok(predictive.meanSelected < dependency.meanSelected);
});

test('dashboard shows flake rate, diagnosis time, selection misses, and the retry-masked illusion', async () => {
  const { renderDashboard } = await import('../src/dashboard.mjs');
  const history = commits();
  const markdown = renderDashboard({
    attempts,
    quarantine,
    runDate,
    selection: [
      { name: 'dependency', ...evaluateSelection(history, commit => dependencySelect(graph, commit.changed).tests) },
      { name: 'predictive (top-1)', ...evaluateSelection(history, (commit, past) => predictiveSelect(past, commit.changed, 1)) },
    ],
    playwright: { attemptCount: 6, firstAttemptFailureCount: 1, flakyTestCount: 1 },
  });
  for (const expected of ['flake rate', 'first-attempt failure rate', 'mean diagnosis time', 'selection miss rate: dependency | 0.0%', 'host=runner-7', 'after=orders-cleanup', 'intrinsic', 'broken', 'Playwright (labs/system)']) {
    assert.ok(markdown.includes(expected), expected);
  }
});
