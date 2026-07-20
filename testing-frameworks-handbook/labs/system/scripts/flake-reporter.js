import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function buildFlakeMetrics(attempts) {
  const firstAttemptFailures = attempts.filter(
    attempt => attempt.retry === 0
      && attempt.status !== attempt.expectedStatus
      && attempt.status !== 'skipped',
  );
  const retryAttempts = attempts.filter(attempt => attempt.retry > 0);
  const recoveredTestIds = new Set(
    retryAttempts
      .filter(attempt => attempt.status === attempt.expectedStatus)
      .map(attempt => attempt.testId),
  );
  const flakyTestIds = new Set(
    firstAttemptFailures
      .filter(attempt => recoveredTestIds.has(attempt.testId))
      .map(attempt => attempt.testId),
  );

  return {
    schemaVersion: 1,
    attemptCount: attempts.length,
    firstAttemptFailureCount: firstAttemptFailures.length,
    retryAttemptCount: retryAttempts.length,
    flakyTestCount: flakyTestIds.size,
    firstAttemptFailures,
  };
}

export default class FlakeReporter {
  #attempts = [];
  #outputFile;

  constructor({
    outputFile = 'test-results/flake-metrics.json',
  } = {}) {
    this.#outputFile = resolve(outputFile);
  }

  onTestEnd(test, result) {
    this.#attempts.push({
      testId: test.id,
      title: test.title,
      titlePath: test.titlePath(),
      file: test.location.file,
      line: test.location.line,
      expectedStatus: test.expectedStatus,
      status: result.status,
      retry: result.retry,
      durationMs: result.duration,
    });
  }

  onEnd() {
    try {
      const metrics = buildFlakeMetrics(this.#attempts);
      mkdirSync(dirname(this.#outputFile), { recursive: true });
      writeFileSync(
        this.#outputFile,
        `${JSON.stringify(metrics, null, 2)}\n`,
      );
      console.log(
        'FLAKE_METRIC'
        + ` first_attempt_failures=${metrics.firstAttemptFailureCount}`
        + ` flaky_tests=${metrics.flakyTestCount}`
        + ` retries=${metrics.retryAttemptCount}`,
      );
      return undefined;
    } catch (error) {
      console.error(`Failed to write flake metrics: ${error.message}`);
      return { status: 'failed' };
    }
  }

  printsToStdio() {
    return true;
  }
}
