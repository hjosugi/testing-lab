import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { listen } from './helpers.js';

test('real HTTP stack creates an order and invokes adapters', async t => {
  const calls = [];
  const server = createApp({
    capture: async (amount, token) => { calls.push(['capture', amount, token]); return 'pay-42'; },
    save: async order => { calls.push(['save', order]); }
  });
  const app = await listen(server);
  t.after(app.close);

  const response = await fetch(`${app.baseUrl}/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId: 'o-1', token: 't-1', items: [{ sku: 'book', quantity: 2, unitPrice: 600 }] })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(body, { orderId: 'o-1', total: 1200, status: 'CONFIRMED', paymentId: 'pay-42' });
  assert.equal(calls[0][0], 'capture');
  assert.equal(calls[1][0], 'save');
});

