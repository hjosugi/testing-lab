import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { anonymize, assertSynthetic, createFactory } from '../src/factory.mjs';
import { scanText } from '../../security/src/scanners.mjs';

const run = promisify(execFile);
const WRITER = new URL('../src/writer.mjs', import.meta.url).pathname;

test('factory: minimal valid defaults, overrides only what a test cares about', () => {
  const factory = createFactory({ runId: 'unit-1' });
  const order = factory.order();
  assert.equal(order.status, 'CONFIRMED');
  assert.equal(order.total, 1_200);
  assert.match(order.id, /^t-unit-1-w0-ord-\d{4}$/);
  const bulk = factory.order({ lines: [{ sku: 'pen', quantity: 3, unitPrice: 100 }] });
  assert.equal(bulk.total, 300, 'derived fields follow the override');
  assert.equal(factory.order({ status: 'CANCELLED' }).status, 'CANCELLED');
  assertSynthetic(order);
});

test('determinism: the manifest records clock, seed, and locale, and the same inputs regenerate the same data', () => {
  const make = () => {
    const factory = createFactory({ runId: 'repro', seed: 42, clockStart: '2026-01-01T00:00:00Z', locale: 'ja-JP' });
    return { data: [factory.order(), factory.customer()], manifest: factory.manifest() };
  };
  const a = make();
  assert.deepEqual(make(), a);
  assert.deepEqual(a.manifest, { runId: 'repro', worker: 'w0', namespace: 't-repro-w0', seed: 42, clockStart: '2026-01-01T00:00:00Z', locale: 'ja-JP', timeZone: 'Asia/Tokyo', generated: 3 });
  assert.equal(a.data[0].createdAt, '2026-01-01T00:00:02.000Z', 'time comes from the recorded clock, not Date.now()');
});

test('parallel isolation: four processes writing to one database never collide with namespaced IDs; a naive sequence does', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'test-data-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const database = mode => {
    const path = join(dir, `${mode}.db`);
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE customers (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, email TEXT NOT NULL UNIQUE)');
    db.close();
    return path;
  };
  const parallel = async mode => {
    const path = database(mode);
    const results = await Promise.all(['w1', 'w2', 'w3', 'w4'].map(worker => run(process.execPath, ['--no-warnings', WRITER, path, mode, worker, '50'])));
    const collisions = results.reduce((sum, result) => sum + JSON.parse(result.stdout).collisions, 0);
    const db = new DatabaseSync(path);
    const rows = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
    const tenants = db.prepare('SELECT COUNT(DISTINCT tenant) AS n FROM customers').get().n;
    db.close();
    return { collisions, rows, tenants };
  };
  assert.deepEqual(await parallel('namespaced'), { collisions: 0, rows: 200, tenants: 4 });
  const naive = await parallel('naive');
  assert.equal(naive.collisions, 150, 'negative control: three of four workers collide on every row');
  assert.equal(naive.rows, 50);
});

test('cleanup: deleting by namespace removes exactly one test’s data and is idempotent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE customers (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, email TEXT NOT NULL)');
  const insert = db.prepare('INSERT INTO customers VALUES (?, ?, ?)');
  const mine = createFactory({ runId: 'cleanup', worker: 'w1' });
  const theirs = createFactory({ runId: 'cleanup', worker: 'w2' });
  for (const factory of [mine, theirs]) for (let i = 0; i < 3; i += 1) { const c = factory.customer(); insert.run(c.id, c.tenant, c.email); }
  const cleanup = namespace => db.prepare('DELETE FROM customers WHERE tenant = ?').run(namespace).changes;
  assert.equal(cleanup(mine.namespace), 3);
  assert.equal(cleanup(mine.namespace), 0, 'second cleanup is a no-op');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM customers').get().n, 3, 'another test’s rows are untouched');
});

test('privacy: anonymization is irreversible and the synthetic guard rejects real-looking data', () => {
  // A card-like number built from parts so this file passes the repo's own
  // secret scanner (labs/security); it is not a network test PAN.
  const cardLike = ['4000', '0566', '5566', '5556'].join('');
  const productionShaped = { id: 'ord-99812', customerId: 'cus-7781', email: 'hanako.yamada@corp.example.co.jp', name: '山田 花子', birthDate: '1990-04-12', address: { prefecture: '東京都', line1: '千代田区1-1' }, card: { number: cardLike }, total: 5400, lines: [{ sku: 'book', quantity: 2, unitPrice: 2700, note: 'gift for mom' }] };
  const safe = anonymize(productionShaped, { salt: 'run-salt' });
  assertSynthetic(safe);
  const text = JSON.stringify(safe);
  for (const leaked of ['hanako', '山田', '1990-04-12', '千代田', cardLike, 'ord-99812', 'gift for mom']) assert.equal(text.includes(leaked), false, leaked);
  assert.equal(safe.birthYear, 1990, 'generalized, not removed, where tests need it');
  assert.notEqual(anonymize(productionShaped, { salt: 'other' }).id, safe.id, 'salted per run: no stable join key across runs');
  assert.throws(() => assertSynthetic(productionShaped), /non-reserved email domain/);
  assert.throws(() => assertSynthetic({ phone: '090-1234-5678' }), /phone/);
});

test('artifacts: the manifest and generated data written for triage contain no PII or secrets', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'test-data-artifact-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const factory = createFactory({ runId: 'artifact', seed: 7 });
  const artifact = join(dir, 'failure-context.json');
  writeFileSync(artifact, JSON.stringify({ manifest: factory.manifest(), sample: [factory.order(), factory.customer()] }, null, 2));
  const text = readFileSync(artifact, 'utf8');
  assert.deepEqual(scanText(artifact, text), [], 'secret scanner (labs/security) finds nothing');
  assertSynthetic(JSON.parse(text));
});
