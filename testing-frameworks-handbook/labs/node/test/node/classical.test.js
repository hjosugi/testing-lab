import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkoutCases, executeCheckoutCase } from '../helpers/checkout-cases.js';

describe('Classical checkout', () => {
  for (const { name, ...checkoutCase } of checkoutCases) {
    test(name, async () => {
      const { expected, orders, payments, result } = await executeCheckoutCase(checkoutCase);

      assert.equal(result.total, expected);
      assert.deepEqual(orders.byId.get('o-1'), result);
      assert.deepEqual(payments.captured, [{ amount: expected, token: 't-1' }]);
    });
  }
});
