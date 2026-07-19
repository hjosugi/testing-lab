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

test('[component/in-process] checkout rejects commands outside the OpenAPI schema', async () => {
  let portCalls = 0;
  const checkout = createCheckout({
    capture: async () => {
      portCalls += 1;
    },
    save: async () => {
      portCalls += 1;
    },
  });
  const invalidCommands = [
    {
      orderId: 'unexpected-field',
      token: 'token-1',
      items: [{ sku: 'book', quantity: 1, unitPrice: 100 }],
      debug: true,
    },
    {
      orderId: 'invalid-item',
      token: 'token-1',
      items: [{ sku: '', quantity: 1, unitPrice: 100 }],
    },
    {
      orderId: 'too-many-items',
      token: 'token-1',
      items: Array.from(
        { length: 11 },
        (_, index) => ({ sku: `item-${index}`, quantity: 1, unitPrice: 1 }),
      ),
    },
  ];

  for (const command of invalidCommands) {
    await assert.rejects(
      checkout(command),
      error => error instanceof CheckoutValidationError,
    );
  }
  assert.equal(portCalls, 0);
});

test('[component/in-process] string limits follow JSON Schema Unicode code points', async () => {
  const checkout = createCheckout();
  const astralCharacter = '𠮷';
  const command = {
    orderId: 'unicode-boundary',
    token: astralCharacter.repeat(128),
    items: [{
      sku: astralCharacter.repeat(64),
      quantity: 1,
      unitPrice: 100,
    }],
  };

  await assert.doesNotReject(checkout(command));
  await assert.rejects(
    checkout({ ...command, token: astralCharacter.repeat(129) }),
    error => error instanceof CheckoutValidationError
      && error.message === 'invalid token',
  );
  await assert.rejects(
    checkout({
      ...command,
      items: [{ ...command.items[0], sku: astralCharacter.repeat(65) }],
    }),
    error => error instanceof CheckoutValidationError
      && error.message === 'invalid sku',
  );
});
