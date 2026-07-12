import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { CartItem, CheckoutService } from '../../src/checkout.js';

test('London checkout sends the important messages', async () => {
  const payments = { capture: mock.fn(async () => 'pay-42') };
  const orders = { save: mock.fn(async () => undefined) };
  const service = new CheckoutService({ payments, orders });

  const result = await service.checkout({
    orderId: 'o-1', items: [new CartItem('book', 2, 600)], token: 't-1'
  });

  assert.equal(payments.capture.mock.callCount(), 1);
  assert.deepEqual(payments.capture.mock.calls[0].arguments, [1200, 't-1']);
  assert.deepEqual(orders.save.mock.calls[0].arguments, [result]);
});

