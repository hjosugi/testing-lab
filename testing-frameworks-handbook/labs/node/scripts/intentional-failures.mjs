import { spawn } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  writeFile
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = fileURLToPath(new URL('../', import.meta.url));
const artifactDirectory = join(labRoot, 'artifacts', 'intentional-failures');
const mochaCli = join(labRoot, 'node_modules', 'mocha', 'bin', 'mocha.js');
const avaCli = join(labRoot, 'node_modules', 'ava', 'entrypoints', 'cli.js');
const sentinel = 'UNAWAITED_CHECKOUT_FAILURE';
const shouldRecord = process.argv.includes('--record');

const cases = [
  {
    id: 'node-test',
    runner: 'node:test',
    args: [
      '--unhandled-rejections=strict',
      '--test',
      'test/intentional-failures/node-unawaited.mjs'
    ]
  },
  {
    id: 'mocha',
    runner: 'Mocha',
    args: [
      '--unhandled-rejections=strict',
      mochaCli,
      '--no-color',
      'test/intentional-failures/mocha-unawaited.mjs'
    ]
  },
  {
    id: 'ava',
    runner: 'AVA',
    args: [
      '--unhandled-rejections=strict',
      avaCli,
      '--no-color',
      '--verbose',
      'test/intentional-failures/ava-unawaited.mjs'
    ]
  }
];

function run(args) {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env, NO_COLOR: '1' };
    delete environment.FORCE_COLOR;
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

function normalize(output) {
  return output
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .replaceAll(labRoot, '<LAB>/')
    .replace(/\(node:\d+\)/g, '(node:<pid>)')
    .replace(/\bduration_ms[: ]+\d+(?:\.\d+)?/g, 'duration_ms: <duration>')
    .replace(/\b\d+(?:\.\d+)?(?:ms|s)\b/g, '<duration>')
    .replace(/\r\n/g, '\n')
    .trim();
}

function artifact(caseDefinition, result) {
  return [
    `# Intentional failure: ${caseDefinition.runner}`,
    '',
    `command: node ${normalize(caseDefinition.args.join(' '))}`,
    `actual_exit: ${result.code}`,
    `required_sentinel: ${sentinel}`,
    '',
    '## stdout',
    '',
    '```text',
    normalize(result.stdout) || '<empty>',
    '```',
    '',
    '## stderr',
    '',
    '```text',
    normalize(result.stderr) || '<empty>',
    '```',
    ''
  ].join('\n');
}

for (const caseDefinition of cases) {
  const result = await run(caseDefinition.args);
  const combinedOutput = `${result.stdout}\n${result.stderr}`;

  if (result.code === 0) {
    throw new Error(`${caseDefinition.runner} incorrectly accepted the unawaited rejection`);
  }
  if (!combinedOutput.includes(sentinel)) {
    throw new Error(`${caseDefinition.runner} output omitted ${sentinel}`);
  }

  const path = join(artifactDirectory, `${caseDefinition.id}.md`);
  if (shouldRecord) {
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(path, artifact(caseDefinition, result));
    console.log(`recorded ${caseDefinition.runner}: exit ${result.code} -> ${path}`);
  } else {
    await access(path);
    const recorded = await readFile(path, 'utf8');
    if (!recorded.includes(sentinel) || !recorded.includes(caseDefinition.runner)) {
      throw new Error(`${path} does not contain the required failure evidence`);
    }
    console.log(`PASS ${caseDefinition.runner}: unawaited rejection exited ${result.code}`);
  }
}
