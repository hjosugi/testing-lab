import assert from 'node:assert/strict';
import sinon from 'sinon';
import { CartItem, CheckoutService } from '../../src/checkout.js';

describe('Mocha + Sinon', () => {
  it('verifies the orchestration protocol', async () => {
    const payments = { capture: sinon.stub().resolves('pay-42') };
    const orders = { save: sinon.stub().resolves() };
    const service = new CheckoutService({ payments, orders });

    const result = await service.checkout({
      orderId: 'o-1', items: [new CartItem('book', 2, 600)], token: 't-1'
    });

    sinon.assert.calledOnceWithExactly(payments.capture, 1200, 't-1');
    sinon.assert.calledOnceWithExactly(orders.save, result);
    assert.equal(result.status, 'CONFIRMED');
  });
});

