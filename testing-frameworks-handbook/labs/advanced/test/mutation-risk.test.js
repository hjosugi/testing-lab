// Assertions added after triaging Stryker survivors in billing, payment-state,
// duplicate-charge, and secret-redaction code. Each test names the mutant
// family it kills; see labs/mutation/decisions.json for the review record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Order, discountedTotal, idempotent, sanitize, totalOf } from '../src/checkout.js';

const line = (quantity, unitPrice, sku = 'SKU') => ({ sku, quantity, unitPrice });

test('billing: unitPriceの境界と型をfield名つきで拒否する', () => {
  assert.equal(totalOf([line(3, 0)]), 0, 'free item is a valid price');
  for (const unitPrice of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, '100']) {
    assert.throws(() => totalOf([line(1, unitPrice)]), { name: 'TypeError', message: /unitPrice/ },
      `unitPrice=${String(unitPrice)}`);
  }
});

test('billing: quantityの境界と型をfield名つきで拒否する', () => {
  assert.equal(totalOf([line(1, 700)]), 700, 'quantity 1 is the smallest valid line');
  for (const quantity of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, '2']) {
    assert.throws(() => totalOf([line(quantity, 100)]), { name: 'TypeError', message: /quantity/ },
      `quantity=${String(quantity)}`);
  }
});

test('billing: 各行が安全でも合計がsafe integerを超えたら拒否する', () => {
  const nearLimit = [line(1, Number.MAX_SAFE_INTEGER - 1, 'A'), line(1, 2, 'B')];
  assert.throws(() => totalOf(nearLimit), { name: 'RangeError', message: /safe integer/ });
  assert.equal(totalOf([line(1, Number.MAX_SAFE_INTEGER - 2, 'A'), line(1, 2, 'B')]), Number.MAX_SAFE_INTEGER);
});

test('billing: discount basis pointの範囲・端点・切り捨てを固定する', () => {
  const cart = [line(1, 999)];
  assert.equal(discountedTotal(cart, 0), 999);
  assert.equal(discountedTotal(cart, 10_000), 0);
  assert.equal(discountedTotal(cart, 1), 998, 'fractional yen is floored in the customer’s favor');
  for (const basisPoints of [-1, 10_001, 1.5, Number.NaN]) {
    assert.throws(() => discountedTotal(cart, basisPoints), { name: 'RangeError', message: /discount/ },
      `basisPoints=${String(basisPoints)}`);
  }
});

test('payment state: reserve前のpayと二重reserve、別keyの再課金を拒否する', () => {
  assert.throws(() => new Order().pay('k1'), /reserved order/);
  assert.equal(new Order().state, 'NEW');

  const twice = new Order();
  twice.reserve();
  assert.throws(() => twice.reserve(), /new order/);
  assert.equal(twice.state, 'RESERVED');

  const paid = new Order();
  paid.reserve();
  paid.pay('k1');
  paid.pay('k1');
  assert.equal(paid.state, 'PAID', 'same idempotency key is a no-op');
  assert.throws(() => paid.pay('k2'), /reserved order/, 'a new key must not charge a paid order');
});

test('duplicate charge: keyごとに一回だけ実行し、別keyは独立に実行する', async () => {
  const calls = [];
  const charge = idempotent(async key => { calls.push(key); return `charged:${key}:${calls.length}`; });
  const [first, again, other] = await Promise.all([charge('a'), charge('a'), charge('b')]);
  assert.equal(first, 'charged:a:1');
  assert.equal(again, first);
  assert.equal(other, 'charged:b:2');
  assert.deepEqual(calls, ['a', 'b']);
  assert.equal(await charge('a'), first, 'settled result is replayed, not recomputed');
});

test('secret leak: card単体・header・array内objectもredactする', () => {
  const safe = sanitize({
    card: '4111111111111111',
    Authorization: 'Bearer abc',
    headers: [{ password: 'p@ss', id: 1 }, 'plain', null],
    amount: 0,
    note: null
  });
  assert.deepEqual(safe, {
    card: '[REDACTED]',
    Authorization: '[REDACTED]',
    headers: [{ password: '[REDACTED]', id: 1 }, 'plain', null],
    amount: 0,
    note: null
  });
  assert.deepEqual(sanitize(['token-looking value']), ['token-looking value'], 'values are not keys');
  assert.equal(sanitize('password'), 'password');
});
