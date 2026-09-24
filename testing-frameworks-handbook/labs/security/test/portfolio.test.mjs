// Portfolio-level checks: traceability from the threat model to tests and
// standards, scanner behavior, finding ledger rules, SBOM/provenance/signature.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcile, validateLedger } from '../src/ledger.mjs';
import { provenanceProblems, sbomFromLock, signSbom, verifySbom } from '../src/sbom.mjs';
import { luhnValid, sastText, scanFiles, scanText, scanWorkflow, walk } from '../src/scanners.mjs';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const handbookRoot = resolve(labRoot, '../..');
const repoRoot = resolve(handbookRoot, '..');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const model = readJson(join(labRoot, 'threat-model.json'));
const TODAY = new Date().toISOString().slice(0, 10);


test('threat model: every abuse case names attacker, asset, boundary, mitigation, standard, and gate', () => {
  const ids = kind => new Set(model[kind].map(entry => entry.id));
  const [attackers, assets, boundaries] = [ids('attackers'), ids('assets'), ids('trustBoundaries')];
  for (const abuse of model.abuseCases) {
    assert.ok(attackers.has(abuse.attacker), abuse.id);
    assert.ok(assets.has(abuse.asset), abuse.id);
    assert.ok(boundaries.has(abuse.boundary), abuse.id);
    assert.ok(abuse.impact && abuse.mitigation, `${abuse.id} records exploit impact and mitigation`);
    assert.ok(abuse.asvs.length > 0, `${abuse.id} traces to ASVS`);
    assert.equal(abuse.gate, abuse.severity === 'critical' ? 'release' : 'ci', `${abuse.id} gate follows severity`);
  }
  for (const boundary of boundaries) assert.ok(model.abuseCases.some(abuse => abuse.boundary === boundary), `${boundary} has an abuse case`);
});

test('traceability: every abuse-case test named in the model exists, and every AC test is in the model', () => {
  const source = ['abuse-cases', 'portfolio'].map(name => readFileSync(join(labRoot, `test/${name}.test.mjs`), 'utf8')).join('\n');
  const declared = [...source.matchAll(/^test\((['"])(AC-\d+.*?)\1,/gm)].map(match => match[2]);
  const modeled = model.abuseCases.flatMap(abuse => abuse.tests);
  assert.deepEqual([...declared].sort(), [...modeled].sort());
});

test('secret scanner: finds real-looking credentials and PANs, ignores synthetic test material', () => {
  const findings = scanText('fixture.txt', [
    `aws = "AKIA${'A'.repeat(16)}"`,
    `token: "gh${'p'}_${'a'.repeat(36)}"`,
    // Built from parts so this test file itself stays clean for the scanner.
    ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' '),
    `card ${['4000', '0566', '5566', '5556'].join('')} used in prod`,
    'card 4111111111111111 is a network test PAN',
    'secret = "test-only-token-abc123456789"',
  ].join('\n')).map(finding => `${finding.line}:${finding.rule}`);
  assert.deepEqual(findings, ['1:aws-access-key', '2:github-token', '2:assigned-secret', '3:private-key', '4:real-pan']);
  assert.equal(luhnValid('4111111111111111'), true);
  assert.deepEqual(sastText('x.js', 'import { execSync } from "node:child_process";\nexecSync(`rm ${dir}`);\ndb.exec(`CREATE TABLE t (a)`);').map(finding => finding.rule), ['child-process-shell-string']);
  assert.equal(luhnValid('4111111111111112'), false);
});

test('AC-07 fixtures and test artifacts contain no secrets or real PANs', () => {
  const textual = name => /\.(json|js|mjs|py|go|rs|php|cs|java|hpp|cpp|ts|yaml|yml|toml|txt|env|md|sql)$/.test(name) && name !== 'package-lock.json';
  const fixtures = [...walk(join(handbookRoot, 'labs'), textual), ...walk(join(handbookRoot, 'templates'), textual)];
  assert.ok(fixtures.length > 100, 'scans the whole lab tree');
  assert.deepEqual(scanFiles(fixtures), []);
});

test('workflow policy: pinned actions, explicit permissions, no untrusted context in shell', () => {
  const workflows = readdirSync(join(repoRoot, '.github/workflows')).filter(name => name.endsWith('.yml'));
  assert.ok(workflows.length >= 2);
  const findings = workflows.flatMap(name => scanWorkflow(name, readFileSync(join(repoRoot, '.github/workflows', name), 'utf8')));
  assert.deepEqual(findings, []);
  const bad = scanWorkflow('bad.yml', [
    'on: pull_request_target',
    'on:',
    '  pull_request_target:',
    'jobs:',
    '  x:',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - run: echo "${{ github.event.pull_request.title }}"',
    '      - run: |',
    '          echo ok',
    '          echo "${{ github.event.issue.body }}"',
  ].join('\n')).map(finding => finding.rule);
  assert.deepEqual(bad, ['workflow-permissions-missing', 'workflow-pull-request-target', 'action-not-pinned-to-sha', 'untrusted-context-in-run', 'untrusted-context-in-run']);
});

test('SAST findings reconcile with the ledger; suppressions need owner, rationale, and expiry', () => {
  const sources = walk(join(handbookRoot, 'labs'), name => /\.(mjs|js)$/.test(name));
  const findings = sources.flatMap(path => sastText(path.slice(handbookRoot.length + 1), readFileSync(path, 'utf8')))
    .map(finding => ({ ...finding, source: 'sast' }));
  const ledger = readJson(join(labRoot, 'findings.json'));
  assert.deepEqual(validateLedger(ledger, TODAY), []);
  const { untriaged, resolved } = reconcile(findings, { findings: ledger.findings.filter(entry => entry.source === 'sast') });
  assert.deepEqual(untriaged, [], 'every finding has an owner and a decision');
  assert.deepEqual(resolved, [], 'fixed findings are removed from the ledger');
});

test('finding ledger: expired suppression, breached SLA, and missing owner fail', () => {
  const base = { id: 'X', source: 'sast', rule: 'eval', path: 'a.js', severity: 'high', impact: 'rce', owner: 'team', openedAt: '2026-09-01', status: 'open' };
  assert.deepEqual(validateLedger({ findings: [base] }, '2026-09-25'), []);
  const errors = validateLedger({
    findings: [
      { ...base, id: 'SLA', path: 'b.js', openedAt: '2026-08-01' },
      { ...base, id: 'EXP', path: 'c.js', status: 'suppressed', rationale: 'r', suppressionExpires: '2026-09-24' },
      { ...base, id: 'OWN', path: 'd.js', owner: '' },
    ],
  }, '2026-09-25');
  assert.deepEqual(errors.map(error => error.split(':')[0]).sort(), ['finding EXP', 'finding OWN', 'finding SLA']);
});

test('SBOM: every npm component has sha512 integrity from the public registry, and signatures detect tampering', () => {
  const locks = ['labs/advanced', 'labs/node', 'labs/system'].map(dir => [dir, readJson(join(handbookRoot, dir, 'package-lock.json'))]);
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  for (const [dir, lock] of locks) {
    const sbom = sbomFromLock(lock, { name: dir });
    assert.ok(sbom.components.length > 0, dir);
    assert.deepEqual(provenanceProblems(sbom), [], dir);
    const envelope = signSbom(sbom, privateKey);
    assert.equal(verifySbom(sbom, envelope, publicKey), true);
    const tampered = structuredClone(sbom);
    tampered.components[0].version = '9.9.9';
    assert.equal(verifySbom(tampered, envelope, publicKey), false, `${dir}: a modified SBOM fails verification`);
  }
  const forged = sbomFromLock({ packages: { 'node_modules/evil': { version: '1.0.0', resolved: 'https://evil.example/evil.tgz' } } }, { name: 'x' });
  assert.deepEqual(provenanceProblems(forged), ['pkg:npm/evil@1.0.0: no sha512 integrity', 'pkg:npm/evil@1.0.0: resolved from evil.example']);
});
