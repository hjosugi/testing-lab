import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSource, auditTree } from '../src/audit.mjs';

const labs = fileURLToPath(new URL('../../', import.meta.url));
const handbook = join(labs, '..');
const inventory = JSON.parse(readFileSync(new URL('../inventory.json', import.meta.url), 'utf8'));
const decisions = JSON.parse(readFileSync(new URL('../decisions.json', import.meta.url), 'utf8'));

test('detectors: no assertion, always-true, same-algorithm expected, and snapshots are found', () => {
  const js = `
test('empty', () => { run(); });
test('tautology', () => { assert.ok(true); });
test('self', () => { const x = f(); assert.equal(x, x); });
test('same formula', () => { const expected = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0); assert.equal(totalOf(items), expected); });
test('snapshot', () => { expect(render()).toMatchSnapshot(); });
test('good', () => { assert.equal(totalOf([{ quantity: 2, unitPrice: 3 }]), 6); });
`;
  const { tests, findings } = auditSource('x.test.js', js);
  assert.equal(tests, 6);
  assert.deepEqual(findings.map(finding => `${finding.test}:${finding.rule}`), ['empty:no-assertion', 'tautology:always-true', 'self:always-true', 'same formula:same-algorithm-expected', 'snapshot:snapshot-assertion']);
  const py = 'def test_nothing():\n    run()\n\ndef test_ok():\n    assert f() == 1\n';
  assert.deepEqual(auditSource('tests/test_x.py', py).findings.map(finding => finding.test), ['test_nothing']);
  const go = 'func TestNothing(t *testing.T) {\n\trun()\n}\n\nfunc TestOk(t *testing.T) {\n\tif f() != 1 { t.Fatal("x") }\n}\n';
  assert.deepEqual(auditSource('x_test.go', go).findings.map(finding => finding.test), ['TestNothing']);
});

test('repository audit: every current finding is fixed or has a recorded decision', () => {
  const { tests, findings } = auditTree(labs);
  assert.ok(tests > 200, `audits the whole polyglot tree (${tests} tests)`);
  const accepted = new Set(decisions.accepted.map(entry => `${entry.path}:${entry.rule}`));
  assert.deepEqual(findings.filter(finding => !accepted.has(`${finding.path}:${finding.rule}`)), []);
  for (const fixed of decisions.fixed) assert.ok(!findings.some(finding => finding.path === fixed.path && finding.rule === fixed.rule), `${fixed.path} stays fixed`);
});

test('inventory: every critical risk has an existing test with an independent oracle and states what it does not guarantee', () => {
  const risks = new Set(inventory.entries.filter(entry => entry.critical).map(entry => entry.risk));
  for (const risk of risks) {
    assert.ok(inventory.entries.some(entry => entry.risk === risk && entry.independence === 'independent'), `${risk} has an independent oracle`);
  }
  for (const entry of inventory.entries) {
    assert.ok(existsSync(join(handbook, entry.test)), entry.test);
    assert.ok(inventory.oracleTypes.includes(entry.oracle), entry.oracle);
    assert.ok(entry.protects && entry.doesNotGuarantee, `${entry.test} records protected failure and limits`);
  }
  assert.ok(inventory.entries.some(entry => entry.independence === 'partial'), 'partial independence is recorded honestly, not hidden');
});

test('every lab README says what a passing suite does not guarantee', () => {
  const missing = readdirSync(labs, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(labs, entry.name, 'README.md')))
    .filter(entry => !/保証しない/.test(readFileSync(join(labs, entry.name, 'README.md'), 'utf8')))
    .map(entry => entry.name);
  assert.deepEqual(missing, []);
});

test('mutation shows why oracle independence matters: a shared-formula oracle misses what an independent one kills', () => {
  const production = mutant => (items) => items.reduce((sum, item) => sum + (mutant ? Math.max(item.quantity - 1, 1) : item.quantity) * item.unitPrice, 0);
  const cart = [{ quantity: 3, unitPrice: 100 }, { quantity: 1, unitPrice: 50 }];
  // Oracle that re-uses the (mutated) production helper: false negative.
  const sharedOracle = mutant => production(mutant)(cart) === production(mutant)(cart);
  // Independent specified value: kills the mutant.
  const independentOracle = mutant => production(mutant)(cart) === 350;
  assert.equal(sharedOracle(false), true);
  assert.equal(sharedOracle(true), true, 'false negative: the mutant survives');
  assert.equal(independentOracle(false), true);
  assert.equal(independentOracle(true), false, 'the independent oracle kills it');
  // False positive example is recorded in labs/php (E-001 equivalent mutant):
  // mutation reports a survivor although no behavior changed.
  assert.match(readFileSync(join(labs, 'php/MUTATION_CLASSIFICATION.md'), 'utf8'), /E-001: equivalent `CastBool`/);
});
