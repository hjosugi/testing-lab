import { spawn } from 'node:child_process';
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = fileURLToPath(new URL('../', import.meta.url));
const artifactDirectory = join(labRoot, 'artifacts');
const artifactPath = join(artifactDirectory, 'execution-semantics.json');
const mochaCli = join(labRoot, 'node_modules', 'mocha', 'bin', 'mocha.js');
const avaCli = join(labRoot, 'node_modules', 'ava', 'entrypoints', 'cli.js');
const shouldRecord = process.argv.includes('--record');

const scenarios = [
  {
    runner: 'node:test',
    scenario: 'same-file serial',
    args: ['--test', 'test/semantics/node/same-file-serial.mjs'],
    expected: { overlap: false, processes: 1, contexts: 1 }
  },
  {
    runner: 'node:test',
    scenario: 'same-file concurrent',
    args: ['--test', 'test/semantics/node/same-file-concurrent.mjs'],
    expected: { overlap: true, processes: 1, contexts: 1 }
  },
  {
    runner: 'node:test',
    scenario: 'process-isolated files',
    args: [
      '--test',
      '--test-concurrency=2',
      'test/semantics/node/file-a.mjs',
      'test/semantics/node/file-b.mjs'
    ],
    expected: { overlap: true, processes: 2, contexts: 2 }
  },
  {
    runner: 'Mocha',
    scenario: 'same-file serial',
    args: [mochaCli, '--no-color', 'test/semantics/mocha/same-file-serial.mjs'],
    expected: { overlap: false, processes: 1, contexts: 1 }
  },
  {
    runner: 'Mocha',
    scenario: 'parallel worker files',
    args: [
      mochaCli,
      '--no-color',
      '--parallel',
      '--jobs=2',
      'test/semantics/mocha/file-a.mjs',
      'test/semantics/mocha/file-b.mjs'
    ],
    expected: { overlap: true, processes: 2, contexts: 2 }
  },
  {
    runner: 'AVA',
    scenario: 'same-file serial',
    args: [avaCli, '--no-color', '--verbose', 'test/semantics/ava/same-file-serial.mjs'],
    expected: { overlap: false, processes: 1, contexts: 1 }
  },
  {
    runner: 'AVA',
    scenario: 'same-file concurrent',
    args: [avaCli, '--no-color', '--verbose', 'test/semantics/ava/same-file-concurrent.mjs'],
    expected: { overlap: true, processes: 1, contexts: 1 }
  },
  {
    runner: 'AVA',
    scenario: 'worker-thread-isolated files',
    args: [
      avaCli,
      '--no-color',
      '--verbose',
      '--concurrency=2',
      'test/semantics/ava/file-a.mjs',
      'test/semantics/ava/file-b.mjs'
    ],
    expected: { overlap: true, processes: 1, contexts: 2 }
  }
];

function run(args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: labRoot,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stderr, stdout });
    });
  });
}

async function readEvents(directory) {
  const events = [];
  for (const file of await readdir(directory)) {
    const content = await readFile(join(directory, file), 'utf8');
    for (const line of content.trim().split('\n')) {
      if (line) events.push(JSON.parse(line));
    }
  }
  return events;
}

function analyze(events) {
  const intervals = new Map();
  for (const event of events) {
    const interval = intervals.get(event.label) ?? {};
    interval[event.phase] = event.timestamp;
    interval.pid = event.pid;
    interval.threadId = event.threadId;
    intervals.set(event.label, interval);
  }

  if (intervals.size !== 2) {
    throw new Error(`expected two measured intervals, received ${intervals.size}`);
  }

  const values = [...intervals.values()];
  for (const interval of values) {
    if (interval.start === undefined || interval.end === undefined) {
      throw new Error('each probe must record a start and end event');
    }
  }

  const overlapMs = Math.min(...values.map(value => value.end))
    - Math.max(...values.map(value => value.start));
  const windowMs = Math.max(...values.map(value => value.end))
    - Math.min(...values.map(value => value.start));
  const processCount = new Set(values.map(value => value.pid)).size;
  const contextCount = new Set(
    values.map(value => `${value.pid}:${value.threadId}`)
  ).size;

  return {
    contextCount,
    overlap: overlapMs >= 100,
    overlapMs: Math.max(0, overlapMs),
    processCount,
    windowMs
  };
}

function verify(scenario, measurement) {
  const mismatches = [];
  for (const [key, expected] of Object.entries(scenario.expected)) {
    const actual = measurement[
      key === 'processes' ? 'processCount'
        : key === 'contexts' ? 'contextCount'
          : key
    ];
    if (actual !== expected) {
      mismatches.push(`${key}: expected ${expected}, received ${actual}`);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`${scenario.runner} ${scenario.scenario}: ${mismatches.join(', ')}`);
  }
}

async function packageVersion(name) {
  const packageJson = JSON.parse(
    await readFile(join(labRoot, 'node_modules', name, 'package.json'), 'utf8')
  );
  return packageJson.version;
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'execution-semantics-'));
const results = [];

try {
  for (const [index, scenario] of scenarios.entries()) {
    const outputDirectory = join(temporaryRoot, String(index));
    await mkdir(outputDirectory);
    const environment = { ...process.env, NO_COLOR: '1', SEMANTICS_DIR: outputDirectory };
    delete environment.FORCE_COLOR;

    const execution = await run(scenario.args, environment);
    if (execution.code !== 0) {
      throw new Error(
        `${scenario.runner} ${scenario.scenario} exited ${execution.code}\n`
        + `${execution.stdout}\n${execution.stderr}`
      );
    }

    const measurement = analyze(await readEvents(outputDirectory));
    verify(scenario, measurement);
    results.push({
      runner: scenario.runner,
      scenario: scenario.scenario,
      command: `node ${scenario.args.map(argument => basename(argument)).join(' ')}`,
      ...measurement
    });
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

console.log('| Runner | Scenario | Window | Overlap | Processes | Contexts |');
console.log('| --- | --- | ---: | ---: | ---: | ---: |');
for (const result of results) {
  console.log(
    `| ${result.runner} | ${result.scenario} | ${result.windowMs} ms `
    + `| ${result.overlap ? `yes (${result.overlapMs} ms)` : 'no'} `
    + `| ${result.processCount} | ${result.contextCount} |`
  );
}

if (shouldRecord) {
  await mkdir(artifactDirectory, { recursive: true });
  const report = {
    measuredAt: new Date().toISOString(),
    runtime: {
      ava: await packageVersion('ava'),
      mocha: await packageVersion('mocha'),
      node: process.version
    },
    note: 'Timings are observations; overlap and isolation relationships are the gated invariants.',
    scenarios: results
  };
  await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`recorded ${artifactPath}`);
} else {
  await access(artifactPath);
  console.log(`verified runtime semantics and recorded artifact ${artifactPath}`);
}
