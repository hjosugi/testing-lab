import assert from 'node:assert/strict';
import sinon from 'sinon';
import { CartItem, CheckoutService } from '../../src/checkout.js';

describe('Sinon spy and stub', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('spy observes the real implementation', async () => {
    const payments = {
      captured: [],
      async capture(amount, token) {
        this.captured.push({ amount, token });
        return 'pay-real';
      }
    };
    const orders = { save: sandbox.stub().resolves() };
    sandbox.spy(payments, 'capture');

    const result = await new CheckoutService({ payments, orders }).checkout({
      orderId: 'o-1',
      items: [new CartItem('book', 2, 600)],
      token: 't-1'
    });

    assert.equal(result.paymentId, 'pay-real');
    assert.deepEqual(payments.captured, [{ amount: 1200, token: 't-1' }]);
    sinon.assert.calledOnceWithExactly(payments.capture, 1200, 't-1');
  });

  it('stub replaces collaborator behavior', async () => {
    const payments = { capture: sandbox.stub().resolves('pay-controlled') };
    const orders = { save: sandbox.stub().resolves() };

    const result = await new CheckoutService({ payments, orders }).checkout({
      orderId: 'o-1',
      items: [new CartItem('book', 2, 600)],
      token: 't-1'
    });

    assert.equal(result.paymentId, 'pay-controlled');
    sinon.assert.calledOnceWithExactly(payments.capture, 1200, 't-1');
  });
});
