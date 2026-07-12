import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  Order, discountedTotal, idempotent, legacyShippingFee, referenceTotal,
  renderReceipt, retry, sanitize, totalOf
} from '../src/checkout.js';

test('1. example: quantity × unit priceを合計する', () => {
  assert.equal(totalOf([{ sku: 'A', quantity: 2, unitPrice: 300 }, { sku: 'B', quantity: 1, unitPrice: 450 }]), 1_050);
  assert.equal(discountedTotal([{ sku: 'A', quantity: 1, unitPrice: 1_000 }], 1_000), 900);
});

function random(seed) {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
}

function generatedItems(seed) {
  const next = random(seed);
  return Array.from({ length: 1 + Math.floor(next() * 20) }, (_, index) => ({
    sku: `SKU-${index}`, quantity: 1 + Math.floor(next() * 10), unitPrice: Math.floor(next() * 100_000)
  }));
}

test('2. property: valid itemを足してtotalは減らない（seedを再現可能にする）', () => {
  for (let seed = 1; seed <= 2_000; seed += 1) {
    const items = generatedItems(seed);
    const extra = { sku: 'EXTRA', quantity: seed % 7 + 1, unitPrice: seed * 3 };
    assert.ok(totalOf([...items, extra]) >= totalOf(items), `seed=${seed}`);
  }
});

test('3. metamorphic: 順序変更とgroup分割でtotalは変わらない', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const items = generatedItems(seed);
    const reversed = [...items].reverse();
    const middle = Math.floor(items.length / 2);
    assert.equal(totalOf(reversed), totalOf(items), `permutation seed=${seed}`);
    assert.equal(totalOf(items.slice(0, middle)) + totalOf(items.slice(middle)), totalOf(items), `partition seed=${seed}`);
  }
});

test('4. differential: 最適化実装を単純referenceと比較する', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const items = generatedItems(seed);
    assert.equal(totalOf(items), referenceTotal(items), `seed=${seed}`);
  }
});

test('5. model-based: 生成command列でorder state machineを比較する', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const sut = new Order();
    let model = 'NEW';
    const commands = seed % 2 === 0 ? ['reserve', 'pay', 'pay'] : ['reserve', 'pay'];
    for (const command of commands) {
      if (command === 'reserve') { sut.reserve(); model = 'RESERVED'; }
      else { sut.pay(`key-${seed}`); model = 'PAID'; }
      assert.equal(sut.state, model, `seed=${seed}, command=${command}`);
    }
  }
});

test('6. concurrency/idempotency: 同時再送でもside effectは一回', async () => {
  let calls = 0;
  const charge = idempotent(async key => { calls += 1; await Promise.resolve(); return `charged:${key}`; });
  const results = await Promise.all(Array.from({ length: 50 }, () => charge('order-42')));
  assert.equal(calls, 1);
  assert.deepEqual(new Set(results), new Set(['charged:order-42']));
});

test('7. fault injection: 一時障害から規定回数内に復旧する', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary outage');
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('8. characterization: legacyの奇妙な現状を安全網として記録する', () => {
  assert.equal(legacyShippingFee(4_000), 500);
  assert.equal(legacyShippingFee(4_001), 501);
  assert.equal(legacyShippingFee(5_001), 0);
});

test('9. snapshot/golden: 人が読める小さなartifactだけ固定する', () => {
  assert.equal(renderReceipt('42', [{ sku: 'BOOK', quantity: 2, unitPrice: 800 }]),
    'ORDER 42\nBOOK x2 = 1600\nTOTAL 1600');
});

test('10. security invariant: nested secretをlog用objectから除去する', () => {
  const safe = sanitize({ user: 'u1', cardNumber: '4111', nested: { accessToken: 'secret', amount: 100 } });
  assert.deepEqual(safe, { user: 'u1', cardNumber: '[REDACTED]', nested: { accessToken: '[REDACTED]', amount: 100 } });
  assert.doesNotMatch(JSON.stringify(safe), /4111|secret/);
});

test('11. performance characterization: 絶対閾値ではなく測定値とcorrectnessを残す', t => {
  const items = generatedItems(42);
  const started = performance.now();
  let result;
  for (let i = 0; i < 10_000; i += 1) result = totalOf(items);
  const elapsedMs = performance.now() - started;
  assert.equal(result, referenceTotal(items));
  assert.ok(Number.isFinite(elapsedMs));
  t.diagnostic(`10,000 iterations: ${elapsedMs.toFixed(2)}ms (informational; not a fixed CI gate)`);
});
