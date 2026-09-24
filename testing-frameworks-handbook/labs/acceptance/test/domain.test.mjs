// Lower-level tests. Each name starts with the rule it pins so traceability
// can join acceptance scenarios (tags) with unit evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCoupon, CouponError } from '../src/domain.mjs';

const coupon = { code: 'C', kind: 'percent', value: 10, minimumSubtotal: 3000, expiresOn: '2026-10-31' };
const apply = overrides => applyCoupon({ subtotal: 3000, shipping: 500, coupon, customer: 'u', today: '2026-10-01', redemptions: new Set(), ...overrides });
const refused = (overrides, code) => assert.throws(() => apply(overrides), error => error instanceof CouponError && error.code === code);

test('R1 percent discount ignores shipping and floors fractions', () => {
  assert.deepEqual(apply({}), { discount: 300, total: 3200 });
  assert.deepEqual(apply({ subtotal: 3005, shipping: 0 }), { discount: 300, total: 2705 });
});

test('R2 minimum subtotal is inclusive', () => {
  refused({ subtotal: 2999 }, 'below-minimum');
  assert.equal(apply({ subtotal: 3000 }).discount, 300);
});

test('R3 one redemption per customer, other customers unaffected', () => {
  const redemptions = new Set();
  apply({ redemptions });
  refused({ redemptions }, 'already-used');
  assert.equal(apply({ redemptions, customer: 'other' }).discount, 300);
});

test('R3 a refused attempt does not consume the redemption', () => {
  const redemptions = new Set();
  refused({ redemptions, subtotal: 100 }, 'below-minimum');
  assert.equal(apply({ redemptions }).discount, 300);
});

test('R4 expiry day is valid, the next day is not', () => {
  assert.equal(apply({ today: '2026-10-31' }).discount, 300);
  refused({ today: '2026-11-01' }, 'expired');
});

test('R5 fixed discount is capped at the item subtotal', () => {
  const fixed = { ...coupon, kind: 'fixed', value: 5000, minimumSubtotal: 0 };
  assert.deepEqual(apply({ coupon: fixed, subtotal: 1200, shipping: 700 }), { discount: 1200, total: 700 });
});
