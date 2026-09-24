import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { createBarrier, createStore } from '../src/orders.mjs';

const evidence = {};
const within = (ms, promise, what) => Promise.race([
  promise,
  new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error(`liveness deadline ${ms}ms exceeded: ${what}`)), ms); timer.unref(); }),
]);

function runWorkers(file, datas) {
  return Promise.all(datas.map(workerData => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(`../src/${file}`, import.meta.url), { workerData });
    const { threadId } = worker;
    let message;
    worker.on('message', value => { message = value; });
    worker.on('error', reject);
    worker.on('exit', code => (code === 0 ? resolve({ ...message, threadId, exitCode: code }) : reject(new Error(`worker exited with ${code}`))));
  })));
}

test('sequential checkout hides both bugs', async () => {
  const store = createStore({ stock: 1 });
  await store.checkoutUnsafe({ customer: 'c1' });
  await store.checkoutUnsafe({ customer: 'c1' });
  assert.equal(store.orders.length, 1);
  assert.equal(store.stock, 0);
});

test('duplicate checkout: concurrent requests pass the check-then-act guard together', async () => {
  const barrier = createBarrier(2);
  const store = createStore({ stock: 5, pause: async point => { if (point === 'after-check') await barrier(); } });
  await within(1_000, Promise.all([store.checkoutUnsafe({ customer: 'c1' }), store.checkoutUnsafe({ customer: 'c1' })]), 'duplicate checkout');
  assert.equal(store.orders.length, 2, 'duplicate order reproduced without sleeps');
  evidence.duplicateCheckout = { orders: store.orders.length };

  const safeBarrier = createBarrier(2);
  const safe = createStore({ stock: 5, pause: async point => { if (point === 'after-check') await safeBarrier(); } });
  const [a, b] = await within(1_000, Promise.all([safe.checkoutSafe({ customer: 'c1', idempotencyKey: 'k1' }), safe.checkoutSafe({ customer: 'c1', idempotencyKey: 'k1' })]), 'safe duplicate');
  assert.deepEqual([a, b], [{ status: 'confirmed' }, { status: 'confirmed' }], 'both callers see the single result');
  assert.equal(safe.orders.length, 1);
});

test('lost update: barrier-forced interleaving oversells with unsafe read-modify-write', async () => {
  const barrier = createBarrier(2);
  const store = createStore({ stock: 1, pause: async point => { if (point === 'after-read') await barrier(); } });
  await within(1_000, Promise.all([store.checkoutUnsafe({ customer: 'c1' }), store.checkoutUnsafe({ customer: 'c2' })]), 'async lost update');
  assert.equal(store.orders.length, 2);
  assert.equal(store.stock, 0, 'two sales, one decrement: the second write overwrote the first');

  const safeBarrier = createBarrier(2);
  const safe = createStore({ stock: 1, pause: async point => { if (point === 'after-read') await safeBarrier(); } });
  const results = await within(1_000, Promise.all([safe.checkoutSafe({ customer: 'c1', idempotencyKey: 'a' }), safe.checkoutSafe({ customer: 'c2', idempotencyKey: 'b' })]), 'optimistic concurrency');
  assert.deepEqual(results.map(result => result.status).sort(), ['confirmed', 'sold-out']);

  // Real parallel threads over shared memory.
  const threads = async mode => {
    const buffer = new SharedArrayBuffer(5 * 4);
    new Int32Array(buffer)[0] = 1;
    const results = await within(5_000, runWorkers('stock-worker.mjs', Array.from({ length: 4 }, () => ({ buffer, mode, parties: 4, attempts: 1 }))), `${mode} threads`);
    const cells = new Int32Array(buffer);
    return { stock: cells[0], reservations: cells[4], log: results.map(result => result.log), exits: results.map(result => result.exitCode) };
  };
  const unsafe = await threads('unsafe');
  assert.equal(unsafe.reservations, 4, 'four threads each sold the last item');
  assert.equal(unsafe.stock, 0);
  assert.ok(unsafe.log.every(entries => entries[0].read === 1), 'every thread read stock=1 before any write');
  for (const mode of ['cas', 'mutex']) {
    const fixed = await threads(mode);
    assert.deepEqual({ stock: fixed.stock, reservations: fixed.reservations }, { stock: 0, reservations: 1 }, mode);
  }
  evidence.lostUpdate = { unsafeThreads: unsafe };
});

test('deadlock: opposite lock order is detected by a deadline and ordered locking completes', async () => {
  const run = async order => {
    const buffer = new SharedArrayBuffer(4 * 4);
    return within(5_000, runWorkers('lock-worker.mjs', [1, 2].map(id => ({ buffer, id, order, deadlineMs: 300 }))), `${order} locks`);
  };
  const opposite = await run('opposite');
  assert.deepEqual(opposite.map(result => ({ completed: result.completed, held: result.held, waitingFor: result.waitingFor })), [
    { completed: false, held: ['A'], waitingFor: 'B' },
    { completed: false, held: ['B'], waitingFor: 'A' },
  ], 'cycle evidence: each thread holds one lock and waits for the other');
  evidence.deadlock = opposite;
  const ordered = await run('ordered');
  assert.ok(ordered.every(result => result.completed), 'a global lock order removes the cycle');
});

test('leaks: every worker thread exits and no test hangs past its liveness deadline', async () => {
  const buffer = new SharedArrayBuffer(5 * 4);
  new Int32Array(buffer)[0] = 3;
  const results = await within(5_000, runWorkers('stock-worker.mjs', Array.from({ length: 3 }, () => ({ buffer, mode: 'mutex', parties: 3, attempts: 2 }))), 'leak check');
  assert.deepEqual(results.map(result => result.exitCode), [0, 0, 0]);
  assert.equal(new Set(results.map(result => result.threadId)).size, 3);
  const active = process.getActiveResourcesInfo().filter(type => /Worker|MessagePort/.test(type));
  assert.deepEqual(active, [], 'no worker or port handles left behind');
  await assert.rejects(within(50, new Promise(() => {}), 'stuck task'), /liveness deadline 50ms exceeded: stuck task/);
});

test('inventory lists every shared resource with a protection and a test that exists', () => {
  const inventory = JSON.parse(readFileSync(new URL('../inventory.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL(import.meta.url), 'utf8');
  for (const entry of inventory.resources) assert.ok(source.includes(`test('${entry.test}'`), entry.test);
  mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../build/concurrency-evidence.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
});
