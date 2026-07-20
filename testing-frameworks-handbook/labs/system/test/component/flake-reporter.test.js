import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import FlakeReporter from '../../scripts/flake-reporter.js';

function testCase(id, title) {
  return {
    id,
    title,
    titlePath: () => ['chromium', title],
    location: {
      file: 'test/e2e/checkout.spec.js',
      line: 1,
    },
    expectedStatus: 'passed',
  };
}

function testResult(status, retry) {
  return {
    status,
    retry,
    duration: 10,
  };
}

test('[component/in-process] flake reporter records pre-retry failures', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'flake-reporter-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const outputFile = join(directory, 'metrics.json');
  const reporter = new FlakeReporter({ outputFile });
  const flaky = testCase('flaky-id', 'flaky journey');
  const stable = testCase('stable-id', 'stable journey');

  reporter.onTestEnd(flaky, testResult('failed', 0));
  reporter.onTestEnd(flaky, testResult('passed', 1));
  reporter.onTestEnd(stable, testResult('passed', 0));
  assert.equal(reporter.onEnd(), undefined);

  const metrics = JSON.parse(readFileSync(outputFile, 'utf8'));
  assert.equal(metrics.attemptCount, 3);
  assert.equal(metrics.firstAttemptFailureCount, 1);
  assert.equal(metrics.retryAttemptCount, 1);
  assert.equal(metrics.flakyTestCount, 1);
  assert.equal(metrics.firstAttemptFailures[0].testId, 'flaky-id');
});
