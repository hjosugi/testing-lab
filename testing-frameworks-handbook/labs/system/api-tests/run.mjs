import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const apiTestsDirectory = dirname(fileURLToPath(import.meta.url));
const systemDirectory = dirname(apiTestsDirectory);
const schemaPath = join(systemDirectory, 'openapi.yaml');
const projectPath = join(apiTestsDirectory, 'pyproject.toml');
const configPath = join(apiTestsDirectory, 'schemathesis.toml');
const corpusPath = join(apiTestsDirectory, 'corpus', 'regressions.json');
const maxExamples = process.env.SCHEMATHESIS_MAX_EXAMPLES ?? '25';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

async function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: systemDirectory,
      env: { ...process.env, PYTHONHASHSEED: '0' },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        output += chunk;
      });
      child.stderr.on('data', chunk => {
        output += chunk;
      });
    }
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} terminated by ${signal}`));
        return;
      }
      resolve({ code, output });
    });
  });
}

function schemathesisArguments(baseUrl, seed, extra) {
  return [
    'run',
    '--frozen',
    '--project',
    projectPath,
    'st',
    '--config-file',
    configPath,
    'run',
    schemaPath,
    '--url',
    baseUrl,
    '--workers',
    '1',
    '--seed',
    String(seed),
    '--generation-database',
    'none',
    '--request-timeout',
    '2',
    '--no-color',
    ...extra,
  ];
}

async function replayCorpus(baseUrl, corpus) {
  for (const entry of corpus.cases) {
    const response = await fetch(`${baseUrl}${entry.path}`, {
      method: entry.method,
      headers: entry.body === undefined
        ? undefined
        : { 'content-type': 'application/json' },
      body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
    });
    assert.equal(
      response.status,
      entry.expected.status,
      `${entry.name}: HTTP status`,
    );
    if (entry.expected.problemType !== undefined) {
      const problem = await response.json();
      assert.equal(
        problem.type,
        entry.expected.problemType,
        `${entry.name}: problem type`,
      );
    }
  }
  console.log(`PASS  API regression corpus (${corpus.cases.length} cases)`);
}

async function runExpectedFailure({
  checkout,
  check,
  expectedOutput,
  name,
  seed,
}) {
  const app = await listen(createApp({ checkout }));
  try {
    const result = await run(
      'uv',
      schemathesisArguments(app.baseUrl, seed, [
        '--phases',
        'fuzzing',
        '--include-operation-id',
        'createOrder',
        '--mode',
        'positive',
        '--max-examples',
        '1',
        '--checks',
        check,
        '--max-failures',
        '1',
      ]),
      { capture: true },
    );
    assert.notEqual(result.code, 0, `${name}: Schemathesis unexpectedly passed`);
    assert.match(result.output, expectedOutput, `${name}: expected diagnostic`);
    console.log(`PASS  ${name}`);
  } finally {
    await app.close();
  }
}

const corpus = JSON.parse(await readFile(corpusPath, 'utf8'));
assert.equal(corpus.formatVersion, 1);
assert.ok(Number.isSafeInteger(corpus.seed));
const app = await listen(createApp());
try {
  await replayCorpus(app.baseUrl, corpus);

  const generation = await run(
    'uv',
    schemathesisArguments(
      app.baseUrl,
      corpus.seed,
      [
        '--phases',
        'coverage,fuzzing',
        '--include-operation-id',
        'createOrder',
        '--mode',
        'all',
        '--max-examples',
        maxExamples,
        '--checks',
        [
          'not_a_server_error',
          'status_code_conformance',
          'content_type_conformance',
          'response_headers_conformance',
          'response_schema_conformance',
          'negative_data_rejection',
          'positive_data_acceptance',
        ].join(','),
      ],
    ),
  );
  assert.equal(generation.code, 0, 'positive/negative generation failed');

  const stateful = await run(
    'uv',
    schemathesisArguments(
      app.baseUrl,
      corpus.seed,
      [
        '--phases',
        'stateful',
        '--mode',
        'positive',
        '--max-examples',
        maxExamples,
        '--checks',
        [
          'not_a_server_error',
          'status_code_conformance',
          'content_type_conformance',
          'response_headers_conformance',
          'response_schema_conformance',
          'use_after_free',
          'ensure_resource_availability',
        ].join(','),
      ],
    ),
  );
  assert.equal(stateful.code, 0, 'stateful lifecycle generation failed');
} finally {
  await app.close();
}

await runExpectedFailure({
  name: 'undocumented 5xx oracle',
  checkout: async () => {
    throw new Error('injected failure');
  },
  check: 'not_a_server_error',
  expectedOutput: /server error|not_a_server_error/i,
  seed: corpus.seed,
});
await runExpectedFailure({
  name: 'response schema mismatch oracle',
  checkout: async () => ({
    orderId: 'oracle-schema',
    total: '100',
    status: 'CONFIRMED',
    paymentId: 'pay-oracle',
  }),
  check: 'response_schema_conformance',
  expectedOutput: /schema|integer/i,
  seed: corpus.seed,
});
await runExpectedFailure({
  name: 'unexpected response field oracle',
  checkout: async () => ({
    orderId: 'oracle-extra',
    total: 100,
    status: 'CONFIRMED',
    paymentId: 'pay-oracle',
    debug: true,
  }),
  check: 'response_schema_conformance',
  expectedOutput: /additional properties|debug|schema/i,
  seed: corpus.seed,
});
