import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CheckoutValidationError,
  createCheckout,
} from '../../src/app.js';

test('[component/in-process] checkout computes state and invokes in-memory ports without HTTP', async () => {
  const calls = [];
  const checkout = createCheckout({
    capture: async (amount, token) => {
      calls.push(['capture', amount, token]);
      return 'pay-component';
    },
    save: async order => {
      calls.push(['save', order]);
    },
  });

  const result = await checkout({
    orderId: 'component-1',
    token: 'token-1',
    items: [{ sku: 'book', quantity: 2, unitPrice: 600 }],
  });

  assert.deepEqual(result, {
    orderId: 'component-1',
    total: 1_200,
    status: 'CONFIRMED',
    paymentId: 'pay-component',
  });
  assert.deepEqual(calls, [
    ['capture', 1_200, 'token-1'],
    ['save', result],
  ]);
});

test('[component/in-process] checkout rejects invalid commands before invoking ports', async () => {
  let portCalls = 0;
  const checkout = createCheckout({
    capture: async () => {
      portCalls += 1;
    },
    save: async () => {
      portCalls += 1;
    },
  });

  await assert.rejects(
    checkout({ orderId: '', token: 'token-1', items: [] }),
    error => error instanceof CheckoutValidationError
      && error.message === 'orderId must not be empty',
  );
  assert.equal(portCalls, 0);
});
