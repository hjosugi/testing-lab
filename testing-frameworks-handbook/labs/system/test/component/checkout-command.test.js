import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCheckoutCommand } from '../../src/checkout-command.js';

test('[component/in-process] checkout commands isolate order data by id', () => {
  const ids = ['first', 'second'];
  const randomUUID = () => ids.shift();

  const first = createCheckoutCommand({ randomUUID });
  const second = createCheckoutCommand({ randomUUID });

  assert.equal(first.orderId, 'order-first');
  assert.equal(second.orderId, 'order-second');
  assert.notEqual(first.orderId, second.orderId);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.items));
  assert.ok(Object.isFrozen(first.items[0]));
});

test('[component/in-process] checkout command rejects an invalid id source', () => {
  assert.throws(
    () => createCheckoutCommand({ randomUUID: 'fixed-id' }),
    {
      name: 'TypeError',
      message: 'randomUUID must be a function',
    },
  );
});
