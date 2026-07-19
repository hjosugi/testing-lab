import assert from 'node:assert/strict';
import { request } from 'node:http';
import { test } from 'node:test';
import { createApp, createCheckout } from '../../src/app.js';
import { listen } from '../helpers.js';

const VALID_COMMAND = {
  orderId: 'o-1',
  token: 't-1',
  items: [{ sku: 'book', quantity: 2, unitPrice: 600 }],
};

async function post(baseUrl, body, headers = {}) {
  return fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

async function assertProblem(response, expected) {
  const body = await response.json();
  assert.equal(response.status, expected.status);
  assert.equal(response.headers.get('content-type'), 'application/problem+json');
  assert.equal(response.headers.get('x-trace-id'), expected.traceId);
  assert.deepEqual(body, {
    type: expected.type,
    title: expected.title,
    status: expected.status,
    detail: expected.detail,
    instance: '/orders',
    traceId: expected.traceId,
  });
}

test('[integration/real-http] POST /orders creates an order through real JSON and TCP boundaries', async t => {
  const calls = [];
  const checkout = createCheckout({
    capture: async (amount, token) => {
      calls.push(['capture', amount, token]);
      return 'pay-42';
    },
    save: async order => {
      calls.push(['save', order]);
    },
  });
  const server = createApp({ checkout });
  const app = await listen(server);
  t.after(app.close);

  const response = await post(
    app.baseUrl,
    JSON.stringify(VALID_COMMAND),
    { 'x-trace-id': 'trace-success-001' },
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('x-trace-id'), 'trace-success-001');
  assert.deepEqual(body, {
    orderId: 'o-1',
    total: 1_200,
    status: 'CONFIRMED',
    paymentId: 'pay-42',
  });
  assert.equal(calls[0][0], 'capture');
  assert.equal(calls[1][0], 'save');
});

test('[integration/real-http] invalid JSON returns traceable RFC 9457 problem details', async t => {
  const app = await listen(createApp());
  t.after(app.close);

  const response = await post(
    app.baseUrl,
    '{"items":',
    { 'x-trace-id': 'trace-invalid-json-001' },
  );

  await assertProblem(response, {
    status: 400,
    type: '/problems/invalid-json',
    title: 'Invalid JSON',
    detail: 'Request body must be valid JSON.',
    traceId: 'trace-invalid-json-001',
  });
});

test('[integration/real-http] checkout timeout aborts downstream work and returns a traceable 504', async t => {
  let observedAbortReason;
  let saveCalls = 0;
  const checkout = createCheckout({
    capture: async (_amount, _token, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        observedAbortReason = signal.reason;
        reject(signal.reason);
      }, { once: true });
    }),
    save: async () => {
      saveCalls += 1;
    },
  });
  const app = await listen(createApp({ checkout, requestTimeoutMs: 25 }));
  t.after(app.close);

  const response = await post(
    app.baseUrl,
    JSON.stringify(VALID_COMMAND),
    { 'x-trace-id': 'trace-timeout-001' },
  );

  await assertProblem(response, {
    status: 504,
    type: '/problems/checkout-timeout',
    title: 'Checkout timed out',
    detail: 'Checkout did not complete within 25 ms.',
    traceId: 'trace-timeout-001',
  });
  assert.equal(observedAbortReason?.name, 'TimeoutError');
  assert.equal(saveCalls, 0);
});

test('[integration/real-http] client cancellation aborts the component signal before save', async t => {
  let startCapture;
  let observeCancellation;
  let saveCalls = 0;
  const captureStarted = new Promise(resolve => {
    startCapture = resolve;
  });
  const cancelled = new Promise(resolve => {
    observeCancellation = resolve;
  });
  const checkout = createCheckout({
    capture: async (_amount, _token, { signal }) => new Promise((resolve, reject) => {
      startCapture();
      signal.addEventListener('abort', () => {
        observeCancellation(signal.reason);
        reject(signal.reason);
      }, { once: true });
    }),
    save: async () => {
      saveCalls += 1;
    },
  });
  const app = await listen(createApp({ checkout, requestTimeoutMs: 5_000 }));
  t.after(app.close);

  const clientRequest = request({
    host: '127.0.0.1',
    port: app.port,
    path: '/orders',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(JSON.stringify(VALID_COMMAND)),
    },
  });
  clientRequest.on('error', () => {});
  clientRequest.end(JSON.stringify(VALID_COMMAND));

  await captureStarted;
  clientRequest.destroy();
  const reason = await cancelled;

  assert.equal(reason?.name, 'AbortError');
  assert.equal(saveCalls, 0);
});

test('[integration/real-http] oversized body returns 413 before component ports run', async t => {
  let checkoutCalls = 0;
  const checkout = async () => {
    checkoutCalls += 1;
  };
  const app = await listen(createApp({ checkout, maxBodyBytes: 256 }));
  t.after(app.close);
  const largeCommand = { ...VALID_COMMAND, padding: 'x'.repeat(1_024) };

  const response = await post(
    app.baseUrl,
    JSON.stringify(largeCommand),
    { 'x-trace-id': 'trace-large-body-001' },
  );

  await assertProblem(response, {
    status: 413,
    type: '/problems/body-too-large',
    title: 'Request body too large',
    detail: 'Request body exceeds 256 bytes.',
    traceId: 'trace-large-body-001',
  });
  assert.equal(checkoutCalls, 0);
});

test('[integration/real-http] parallel servers receive unique ephemeral ports', async t => {
  const apps = await Promise.all(
    Array.from({ length: 8 }, () => listen(createApp())),
  );
  t.after(() => Promise.all(apps.map(app => app.close())));

  assert.equal(new Set(apps.map(app => app.port)).size, apps.length);

  const responses = await Promise.all(
    apps.map((app, index) => post(
      app.baseUrl,
      JSON.stringify({ ...VALID_COMMAND, orderId: `parallel-${index}` }),
    )),
  );
  assert.deepEqual(responses.map(response => response.status), Array(8).fill(201));
});
