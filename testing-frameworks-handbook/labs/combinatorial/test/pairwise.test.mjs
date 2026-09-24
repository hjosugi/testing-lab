import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildMatrix, coverage, fullMatrix, generatePairwise, violates } from '../src/pairwise.mjs';

const model = JSON.parse(readFileSync(new URL('../model.json', import.meta.url), 'utf8'));
const matrix = JSON.parse(readFileSync(new URL('../matrix.json', import.meta.url), 'utf8'));

test('constraints: invalid combinations are defined and never generated', () => {
  assert.equal(violates(model, { payment: 'konbini', locale: 'en-US' }), 'C1');
  assert.equal(violates(model, { payment: 'invoice', auth: 'password' }), 'C2');
  assert.equal(violates(model, { auth: 'guest', bundleDiscountFlag: 'on' }), 'C3');
  assert.equal(violates(model, { payment: 'card', locale: 'ar-SA', auth: 'guest', bundleDiscountFlag: 'off' }), null);
  assert.deepEqual(matrix.cases.filter(testCase => violates(model, testCase)), []);
});

test('past incident combinations are pinned first and must themselves be valid', () => {
  assert.deepEqual(matrix.cases.slice(0, 2).map(testCase => testCase.reason), ['INC-2026-031', 'INC-2026-044']);
  for (const incident of model.mustInclude) assert.equal(violates(model, incident.case), null, incident.id);
});

test('coverage criterion: 100% of valid pairs, with every excluded pair explained by a constraint', () => {
  const pairs = coverage(model, matrix.cases, 2);
  assert.equal(pairs.ratio, 1);
  assert.deepEqual(pairs.missing, []);
  assert.ok(matrix.excludedPairs.length > 0);
  assert.deepEqual(matrix.excludedPairs.filter(entry => entry.constraint === 'unexplained'), []);
  assert.ok(matrix.excludedPairs.some(entry => entry.pair === 'auth=guest&payment=invoice' && entry.constraint === 'C2'), 'indirect exclusions are explained too');
  assert.ok(matrix.stats.tripleCoverage < 1, 'pairwise does not claim 3-way coverage');
});

test('cost: the pairwise suite is a fraction of the valid full matrix', () => {
  const full = fullMatrix(model);
  assert.equal(full.all, 288);
  assert.equal(full.valid.length, matrix.stats.validConfigurations);
  assert.ok(matrix.cases.length * 5 < full.valid.length, `${matrix.cases.length} vs ${full.valid.length}`);
  assert.ok(matrix.stats.ciMinutes.pairwise < matrix.stats.ciMinutes.fullValid / 5);
});

test('the matrix regenerates identically from model.json and the seed', () => {
  assert.deepEqual(buildMatrix(model), matrix);
  assert.deepEqual(generatePairwise(model, { seed: matrix.seed }), matrix.cases);
  const script = fileURLToPath(new URL('../scripts/generate.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('an invalid pinned incident is rejected instead of silently generating an impossible case', () => {
  const bad = structuredClone(model);
  bad.mustInclude.push({ id: 'BAD', case: { browser: 'chromium', locale: 'en-US', auth: 'guest', payment: 'konbini', bundleDiscountFlag: 'off' } });
  assert.equal(violates(bad, bad.mustInclude.at(-1).case), 'C1');
  assert.throws(() => generatePairwise(bad), /BAD violates C1/);
});
