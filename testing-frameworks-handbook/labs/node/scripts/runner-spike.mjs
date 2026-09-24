// Runner selection spike (Issue #31/#50): runs the same five cases under
// node:test, Mocha, and AVA, then scores what a person triaging a failure
// gets from each runner and what adopting it costs. Only stable, measured
// facts are written to artifacts/runner-spike.json; `--check` recomputes them.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = fileURLToPath(new URL('../', import.meta.url));
const artifact = join(labRoot, 'artifacts', 'runner-spike.json');
const bin = {
  mocha: join(labRoot, 'node_modules', 'mocha', 'bin', 'mocha.js'),
  ava: join(labRoot, 'node_modules', 'ava', 'entrypoints', 'cli.js'),
};
const runners = [
  { id: 'node:test', file: 'test/spike/node.spike.js', args: file => ['--test', file], junit: file => ['--test', '--test-reporter=junit', file] },
  { id: 'Mocha', file: 'test/spike/mocha.spike.js', args: file => [bin.mocha, '--no-color', file], junit: file => [bin.mocha, '--reporter', 'xunit', file] },
  { id: 'AVA', file: 'test/spike/ava.spike.js', args: file => [bin.ava, '--no-color', '--verbose', file], junit: null },
];

const run = (args, env = {}) => {
  const result = spawnSync(process.execPath, args, { cwd: labRoot, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...env } });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
};

function transitivePackages(root) {
  const lock = JSON.parse(readFileSync(join(labRoot, 'package-lock.json'), 'utf8'));
  const seen = new Set();
  const visit = name => {
    if (seen.has(name)) return;
    const entry = lock.packages[`node_modules/${name}`];
    if (!entry) return;
    seen.add(name);
    for (const dependency of Object.keys(entry.dependencies ?? {})) visit(dependency);
  };
  visit(root);
  return seen.size;
}

const engines = name => JSON.parse(readFileSync(join(labRoot, 'node_modules', name, 'package.json'), 'utf8')).engines?.node ?? 'unspecified';

const scorecard = runners.map(runner => {
  const normal = run(runner.args(runner.file));
  const failing = run(runner.args(runner.file), { SPIKE_INTENTIONAL: '1' });
  const out = failing.output;
  const junit = runner.junit ? run(runner.junit(runner.file)) : null;
  return {
    runner: runner.id,
    fiveCasesPass: normal.status === 0,
    intentionalFailureExitsNonZero: failing.status !== 0,
    diagnostics: {
      namesTheTest: out.includes('diagnostic failure'),
      pointsToSourceLine: /spike\.js:\d+/.test(out),
      showsBothDifferingValues: out.includes('pay-1800') && out.includes('pay-1500') && out.includes('1800') && out.includes('1500'),
      showsStructuredDiff: /^\s*[-+]\s+(total|paymentId|"total"|"paymentId")/m.test(out),
    },
    // Exact testcase counts differ across Node versions (subtests, skips), so
    // the record keeps the stable fact: the XML lists every spike case.
    junitXml: junit ? { builtIn: true, reporter: runner.id === 'Mocha' ? 'xunit' : 'junit', listsAllCases: (junit.output.match(/<testcase\b/g) ?? []).length >= 7 } : { builtIn: false, note: 'TAP only (--tap); JUnit needs an external converter' },
    footprint: runner.id === 'node:test' ? { npmPackages: 0, engines: 'bundled with Node' } : { npmPackages: transitivePackages(runner.id === 'Mocha' ? 'mocha' : 'ava'), engines: engines(runner.id === 'Mocha' ? 'mocha' : 'ava') },
  };
});

const record = { schemaVersion: 1, node: process.versions.node.split('.')[0], scorecard };
if (process.argv.includes('--record')) {
  writeFileSync(artifact, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`recorded ${artifact}`);
} else {
  const committed = JSON.parse(readFileSync(artifact, 'utf8'));
  const stable = value => JSON.stringify(value.scorecard);
  if (stable(committed) !== stable(record)) {
    console.error('runner spike scorecard drifted from artifacts/runner-spike.json');
    console.error(JSON.stringify(record.scorecard, null, 2));
    process.exit(1);
  }
  for (const row of scorecard) {
    if (!row.fiveCasesPass || !row.intentionalFailureExitsNonZero) {
      console.error(`${row.runner}: five cases must pass and the intentional failure must fail`);
      process.exit(1);
    }
  }
  console.log(`PASS runner spike: ${scorecard.map(row => row.runner).join(', ')} match the recorded scorecard`);
}
