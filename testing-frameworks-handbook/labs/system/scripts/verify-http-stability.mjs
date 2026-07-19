import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const runs = Number(process.env.HTTP_STABILITY_RUNS ?? '100');

if (!Number.isSafeInteger(runs) || runs <= 0) {
  throw new Error(`HTTP_STABILITY_RUNS must be a positive safe integer, got ${runs}`);
}

const startedAt = performance.now();
for (let run = 1; run <= runs; run += 1) {
  const result = spawnSync(
    process.execPath,
    ['--test', 'test/http/orders-http-integration.test.js'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    process.stderr.write(`HTTP integration stability failed on run ${run}/${runs}\n`);
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  if (run % 10 === 0 || run === runs) {
    process.stdout.write(`HTTP integration stability: ${run}/${runs} green\n`);
  }
}

const elapsedSeconds = ((performance.now() - startedAt) / 1_000).toFixed(2);
process.stdout.write(
  `HTTP integration stability: ${runs} consecutive runs green in ${elapsedSeconds}s\n`,
);
