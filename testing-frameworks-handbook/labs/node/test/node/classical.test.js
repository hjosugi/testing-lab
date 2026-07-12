import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CartItem, CheckoutService } from '../../src/checkout.js';
import { FakePayments, InMemoryOrders } from '../helpers/fakes.js';

describe('Classical checkout', () => {
  for (const { name, items, expected } of [
    { name: 'one item type', items: [new CartItem('book', 2, 600)], expected: 1200 },
    { name: 'two item types', items: [new CartItem('a', 1, 100), new CartItem('b', 3, 50)], expected: 250 }
  ]) {
    test(name, async () => {
      const payments = new FakePayments();
      const orders = new InMemoryOrders();
      const service = new CheckoutService({ payments, orders });

      const result = await service.checkout({ orderId: 'o-1', items, token: 't-1' });

      assert.equal(result.total, expected);
      assert.deepEqual(orders.byId.get('o-1'), result);
      assert.deepEqual(payments.captured, [{ amount: expected, token: 't-1' }]);
    });
  }
});

