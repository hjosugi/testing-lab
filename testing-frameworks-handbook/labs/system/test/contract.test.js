import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { listen } from './helpers.js';

test('POST /orders response preserves the published consumer contract', async t => {
  const app = await listen(createApp());
  t.after(app.close);
  const response = await fetch(`${app.baseUrl}/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId: 'o-9', token: 'valid', items: [{ sku: 'x', quantity: 1, unitPrice: 99 }] })
  });
  const body = await response.json();

  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.deepEqual(Object.keys(body).sort(), ['orderId', 'paymentId', 'status', 'total']);
  assert.equal(typeof body.orderId, 'string');
  assert.equal(typeof body.paymentId, 'string');
  assert.equal(body.status, 'CONFIRMED');
  assert.equal(typeof body.total, 'number');
});

