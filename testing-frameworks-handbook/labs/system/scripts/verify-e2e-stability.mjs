import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repeats = Number(process.env.E2E_STABILITY_RUNS ?? 100);
const workers = Number(process.env.E2E_STABILITY_WORKERS ?? 1);
const shardTotal = 2;
const journeyCount = 2;
const browserCount = 3;

for (const [name, value] of [
  ['E2E_STABILITY_RUNS', repeats],
  ['E2E_STABILITY_WORKERS', workers],
]) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function runShard(shard, metricsPath) {
  return new Promise((resolve, reject) => {
    const childEnvironment = {
      ...process.env,
      CI: '1',
      PLAYWRIGHT_STABILITY: '1',
      PLAYWRIGHT_FLAKE_METRICS_PATH: metricsPath,
    };
    delete childEnvironment.FORCE_COLOR;
    delete childEnvironment.NO_COLOR;

    const child = spawn(
      process.execPath,
      [
        './node_modules/@playwright/test/cli.js',
        'test',
        `--repeat-each=${repeats}`,
        `--shard=${shard}/${shardTotal}`,
        `--workers=${workers}`,
        '--retries=1',
      ],
      {
        cwd: new URL('..', import.meta.url),
        env: childEnvironment,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Playwright shard ${shard}/${shardTotal} failed`
            + ` (exit=${code ?? 'null'}, signal=${signal ?? 'none'})`,
          ),
        );
      }
    });
  });
}

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), 'playwright-stability-'),
);
let attemptCount = 0;

try {
  for (let shard = 1; shard <= shardTotal; shard += 1) {
    const metricsPath = join(temporaryDirectory, `shard-${shard}.json`);
    await runShard(shard, metricsPath);
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    if (
      metrics.firstAttemptFailureCount !== 0
      || metrics.flakyTestCount !== 0
      || metrics.retryAttemptCount !== 0
    ) {
      throw new Error(
        `Shard ${shard}/${shardTotal} recorded a pre-retry failure: `
        + JSON.stringify(metrics.firstAttemptFailures),
      );
    }
    attemptCount += metrics.attemptCount;
    console.log(
      `E2E stability: shard ${shard}/${shardTotal} green`
      + ` (${metrics.attemptCount} attempts)`,
    );
  }

  const expectedAttempts = repeats * journeyCount * browserCount;
  if (attemptCount !== expectedAttempts) {
    throw new Error(
      `Expected ${expectedAttempts} attempts, observed ${attemptCount}`,
    );
  }
  console.log(
    `E2E stability: ${repeats} repeats x ${journeyCount} journeys`
    + ` x ${browserCount} browsers = ${attemptCount} attempts, flake 0`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
