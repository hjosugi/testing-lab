// Markdown dashboard: flake rate, first-attempt vs retry-masked view, cluster
// attribution, diagnosis time, selection miss rate, and (when present) the
// Playwright first-attempt metrics written by labs/system's flake reporter.
import { attribute, classifyRuns, coFailureClusters, flakeSummary } from './analysis.mjs';
import { diagnosisDays } from './quarantine.mjs';

const pct = value => `${(value * 100).toFixed(1)}%`;

export function renderDashboard({ attempts, quarantine, runDate, selection, playwright }) {
  const classified = classifyRuns(attempts);
  const summary = flakeSummary(classified);
  const clusters = coFailureClusters(classified).map(cluster => attribute(cluster, classified));
  const diagnosis = diagnosisDays(classified, quarantine.entries, runDate);
  const lines = [
    '## Flakiness dashboard',
    '',
    `| Metric | Value |`,
    `|---|---:|`,
    `| test runs | ${summary.testRuns} |`,
    `| first-attempt failure rate | ${pct(summary.firstAttemptFailureRate)} |`,
    `| flake rate (failed, then passed on retry) | ${pct(summary.flakeRate)} |`,
    `| pass rate if retries were allowed to hide failures | ${pct(summary.retryMaskedPassRate)} |`,
    `| mean diagnosis time (first flake → quarantine) | ${(diagnosis.reduce((sum, row) => sum + row.days, 0) / diagnosis.length).toFixed(1)} days |`,
    ...selection.map(row => `| selection miss rate: ${row.name} | ${pct(row.missRate)} (${row.misses}/${row.failingCommits}, mean ${row.meanSelected.toFixed(1)} tests, max delay ${row.maxDetectionDelay}) |`),
    '',
    '| Cluster | Kind | Explanation |',
    '|---|---|---|',
    ...clusters.map(cluster => `| ${cluster.cluster.join(', ')} | ${cluster.kind} | ${cluster.feature ? `${cluster.feature} (precision ${cluster.precision}, lift ${cluster.lift})` : cluster.explanation} |`),
  ];
  if (playwright) {
    lines.push('', `Playwright (labs/system): ${playwright.attemptCount} attempts, ${playwright.firstAttemptFailureCount} first-attempt failure(s), ${playwright.flakyTestCount} flaky test(s).`);
  }
  return `${lines.join('\n')}\n`;
}
