import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { listen } from '../helpers.js';

const COMMAND = {
  orderId: 'stateful-1',
  token: 'token-1',
  items: [{ sku: 'book', quantity: 2, unitPrice: 600 }],
};

test('[integration/real-http] POST then GET then DELETE follows the order lifecycle', async t => {
  const app = await listen(createApp());
  t.after(app.close);

  const created = await fetch(`${app.baseUrl}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(COMMAND),
  });
  const order = await created.json();

  assert.equal(created.status, 201);
  assert.equal(created.headers.get('location'), '/orders/stateful-1');

  const fetched = await fetch(`${app.baseUrl}/orders/stateful-1`);
  assert.equal(fetched.status, 200);
  assert.deepEqual(await fetched.json(), order);

  const deleted = await fetch(`${app.baseUrl}/orders/stateful-1`, {
    method: 'DELETE',
  });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');

  const afterDelete = await fetch(`${app.baseUrl}/orders/stateful-1`);
  const problem = await afterDelete.json();
  assert.equal(afterDelete.status, 404);
  assert.equal(problem.type, '/problems/order-not-found');
  assert.equal(problem.instance, '/orders/stateful-1');
});
