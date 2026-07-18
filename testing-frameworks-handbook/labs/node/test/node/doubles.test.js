import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartItem, CheckoutService } from '../../src/checkout.js';

test('mock.method observes the real implementation like a spy', async t => {
  const payments = {
    captured: [],
    async capture(amount, token) {
      this.captured.push({ amount, token });
      return 'pay-real';
    }
  };
  const orders = { save: t.mock.fn(async () => undefined) };
  t.mock.method(payments, 'capture');

  const result = await new CheckoutService({ payments, orders }).checkout({
    orderId: 'o-1',
    items: [new CartItem('book', 2, 600)],
    token: 't-1'
  });

  assert.equal(result.paymentId, 'pay-real');
  assert.deepEqual(payments.captured, [{ amount: 1200, token: 't-1' }]);
  assert.deepEqual(payments.capture.mock.calls[0].arguments, [1200, 't-1']);
});

test('mock.fn replaces collaborator behavior like a stub', async t => {
  const payments = { capture: t.mock.fn(async () => 'pay-controlled') };
  const orders = { save: t.mock.fn(async () => undefined) };

  const result = await new CheckoutService({ payments, orders }).checkout({
    orderId: 'o-1',
    items: [new CartItem('book', 2, 600)],
    token: 't-1'
  });

  assert.equal(result.paymentId, 'pay-controlled');
  assert.equal(payments.capture.mock.callCount(), 1);
});
