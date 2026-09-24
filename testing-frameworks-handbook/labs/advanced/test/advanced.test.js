import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  Order, discountedTotal, idempotent, legacyShippingFee,
  referenceTotal, renderReceipt, retry, sanitize, totalOf
} from '../src/checkout.js';

test('example: quantity × unit priceを合計する', () => {
  assert.equal(totalOf([{ sku: 'A', quantity: 2, unitPrice: 300 }, { sku: 'B', quantity: 1, unitPrice: 450 }]), 1_050);
  assert.equal(discountedTotal([{ sku: 'A', quantity: 1, unitPrice: 1_000 }], 1_000), 900);
  assert.throws(
    () => totalOf([{ sku: 'A', quantity: Number.MAX_SAFE_INTEGER, unitPrice: 2 }]),
    /safe integer/
  );
});

test('model-based: 生成command列でorder state machineを比較する', () => {
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

test('concurrency/idempotency: 同時再送でもside effectは一回', async () => {
  let calls = 0;
  const charge = idempotent(async key => { calls += 1; await Promise.resolve(); return `charged:${key}`; });
  const results = await Promise.all(Array.from({ length: 50 }, () => charge('order-42')));
  assert.equal(calls, 1);
  assert.deepEqual(new Set(results), new Set(['charged:order-42']));
});

test('fault injection: 一時障害から規定回数内に復旧する', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary outage');
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('characterization: legacyの奇妙な現状を安全網として記録する', () => {
  assert.equal(legacyShippingFee(4_000), 500);
  assert.equal(legacyShippingFee(4_001), 501);
  assert.equal(legacyShippingFee(5_001), 0);
});

test('snapshot/golden: 人が読める小さなartifactだけ固定する', () => {
  assert.equal(renderReceipt('42', [{ sku: 'BOOK', quantity: 2, unitPrice: 800 }]),
    'ORDER 42\nBOOK x2 = 1600\nTOTAL 1600');
});

test('security invariant: nested secretをlog用objectから除去する', () => {
  const safe = sanitize({ user: 'u1', cardNumber: '4111', nested: { accessToken: 'secret', amount: 100 } });
  assert.deepEqual(safe, { user: 'u1', cardNumber: '[REDACTED]', nested: { accessToken: '[REDACTED]', amount: 100 } });
  assert.doesNotMatch(JSON.stringify(safe), /4111|secret/);
});

test('performance characterization: 絶対閾値ではなく測定値とcorrectnessを残す', t => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    sku: `SKU-${index}`,
    quantity: index + 1,
    unitPrice: index * 997
  }));
  // Independent oracle (repeated addition), not the production formula; found by labs/oracles.
  const expected = referenceTotal(items);
  const started = performance.now();
  let result;
  for (let i = 0; i < 10_000; i += 1) result = totalOf(items);
  const elapsedMs = performance.now() - started;
  assert.equal(result, expected);
  assert.ok(Number.isFinite(elapsedMs));
  t.diagnostic(`10,000 iterations: ${elapsedMs.toFixed(2)}ms (informational; not a fixed CI gate)`);
});
