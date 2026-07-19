import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { listen } from './helpers.js';

test('[contract/real-http] POST /orders success preserves the published consumer shape', async t => {
  const app = await listen(createApp());
  t.after(app.close);
  const response = await fetch(`${app.baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': 'trace-contract-success',
    },
    body: JSON.stringify({
      orderId: 'o-9',
      token: 'valid',
      items: [{ sku: 'x', quantity: 1, unitPrice: 99 }],
    }),
  });
  const body = await response.json();

  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(response.headers.get('x-trace-id'), 'trace-contract-success');
  assert.equal(response.headers.get('location'), '/orders/o-9');
  assert.deepEqual(Object.keys(body).sort(), ['orderId', 'paymentId', 'status', 'total']);
  assert.equal(typeof body.orderId, 'string');
  assert.equal(typeof body.paymentId, 'string');
  assert.equal(body.status, 'CONFIRMED');
  assert.equal(typeof body.total, 'number');
});

test('[contract/real-http] invalid JSON exposes the published RFC 9457 error shape', async t => {
  const app = await listen(createApp());
  t.after(app.close);
  const response = await fetch(`${app.baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': 'trace-contract-problem',
    },
    body: '{',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('content-type'), 'application/problem+json');
  assert.equal(response.headers.get('x-trace-id'), body.traceId);
  assert.deepEqual(
    Object.keys(body).sort(),
    ['detail', 'instance', 'status', 'title', 'traceId', 'type'],
  );
  assert.equal(body.type, '/problems/invalid-json');
  assert.equal(body.status, 400);
  assert.equal(body.traceId, 'trace-contract-problem');
});
