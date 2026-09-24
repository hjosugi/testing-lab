// Flake analysis over attempt-level CI history: first attempts are stored
// separately from retries, failures are clustered by co-occurrence, and
// clusters are attributed to the host/worker/fixture/service/order feature
// that explains them.

export function classifyRuns(attempts) {
  const byRunTest = new Map();
  for (const attempt of attempts) {
    const key = `${attempt.runId}:${attempt.testId}`;
    byRunTest.set(key, [...(byRunTest.get(key) ?? []), attempt]);
  }
  return [...byRunTest.values()].map(list => {
    const sorted = list.sort((a, b) => a.attempt - b.attempt);
    const first = sorted[0];
    const last = sorted.at(-1);
    const status = first.passed ? 'pass' : last.passed ? 'flaky' : 'fail';
    return { runId: first.runId, testId: first.testId, status, attempts: sorted.length, first };
  });
}

export function flakeSummary(classified) {
  const total = classified.length;
  const count = status => classified.filter(row => row.status === status).length;
  const perTest = {};
  for (const row of classified) {
    const stats = perTest[row.testId] ?? { runs: 0, firstAttemptFailures: 0, flaky: 0, fail: 0 };
    stats.runs += 1;
    if (row.status !== 'pass') stats.firstAttemptFailures += 1;
    if (row.status === 'flaky') stats.flaky += 1;
    if (row.status === 'fail') stats.fail += 1;
    perTest[row.testId] = stats;
  }
  return {
    testRuns: total,
    firstAttemptFailureRate: (count('flaky') + count('fail')) / total,
    flakeRate: count('flaky') / total,
    // What a retry-until-green dashboard would show.
    retryMaskedPassRate: (count('pass') + count('flaky')) / total,
    perTest,
  };
}

const jaccard = (a, b) => {
  const intersection = [...a].filter(value => b.has(value)).length;
  return intersection / (a.size + b.size - intersection);
};

// Single-linkage clustering of tests whose first-attempt failures happen in
// the same runs (Jaccard >= threshold).
export function coFailureClusters(classified, { threshold = 0.5 } = {}) {
  const failingRuns = new Map();
  for (const row of classified) {
    if (row.status === 'pass') continue;
    failingRuns.set(row.testId, (failingRuns.get(row.testId) ?? new Set()).add(row.runId));
  }
  const tests = [...failingRuns.keys()].sort();
  const parent = new Map(tests.map(test => [test, test]));
  const find = test => (parent.get(test) === test ? test : find(parent.get(test)));
  for (let i = 0; i < tests.length; i += 1) {
    for (let j = i + 1; j < tests.length; j += 1) {
      if (jaccard(failingRuns.get(tests[i]), failingRuns.get(tests[j])) >= threshold) parent.set(find(tests[j]), find(tests[i]));
    }
  }
  const clusters = new Map();
  for (const test of tests) clusters.set(find(test), [...(clusters.get(find(test)) ?? []), test]);
  return [...clusters.values()];
}

function features(first, runOrder) {
  const before = runOrder.get(first.runId).slice(0, first.position);
  return [`host=${first.host}`, `worker=${first.worker}`, `fixture=${first.fixture}`, `service=${first.service}`, ...before.map(test => `after=${test}`)];
}

// Attribute a cluster to the feature with the highest near-deterministic
// failure probability (support >= minSupport, P(fail|feature) >= minPrecision).
// No such feature => "intrinsic" (timing/randomness inside the test).
export function attribute(cluster, classified, { minSupport = 5, minPrecision = 0.8 } = {}) {
  const runOrder = new Map();
  for (const row of classified) {
    const order = runOrder.get(row.runId) ?? [];
    order[row.first.position] = row.testId;
    runOrder.set(row.runId, order);
  }
  const rows = classified.filter(row => cluster.includes(row.testId));
  const failRows = rows.filter(row => row.status !== 'pass');
  const consistent = failRows.filter(row => row.status === 'fail');
  if (consistent.length === failRows.length && failRows.length > 0) {
    const since = Math.min(...consistent.map(row => row.runId));
    return { cluster, kind: 'broken', explanation: `fails every attempt since run ${since} (regression, not flake)` };
  }
  const stats = new Map();
  for (const row of rows) {
    for (const feature of features(row.first, runOrder)) {
      const entry = stats.get(feature) ?? { total: 0, failed: 0 };
      entry.total += 1;
      if (row.status !== 'pass') entry.failed += 1;
      stats.set(feature, entry);
    }
  }
  const baseRate = failRows.length / rows.length;
  const candidates = [...stats.entries()]
    .filter(([, entry]) => entry.failed >= minSupport && entry.failed / entry.total >= minPrecision)
    .map(([feature, entry]) => ({ feature, precision: entry.failed / entry.total, recall: entry.failed / failRows.length, lift: entry.failed / entry.total / baseRate }))
    .sort((a, b) => b.recall - a.recall || b.precision - a.precision || a.feature.localeCompare(b.feature));
  if (candidates.length === 0) return { cluster, kind: 'intrinsic', explanation: `no host/worker/fixture/service/order feature explains ${failRows.length} failures` };
  return { cluster, kind: 'systemic', feature: candidates[0].feature, precision: candidates[0].precision, recall: candidates[0].recall, lift: Math.round(candidates[0].lift * 10) / 10 };
}
