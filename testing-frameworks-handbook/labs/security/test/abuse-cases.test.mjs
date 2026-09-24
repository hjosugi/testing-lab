// Abuse-case tests derived from threat-model.json. Test names start with the
// abuse-case ID; test/traceability.test.mjs fails if a critical case loses its
// test. Each control also has an "unsafe" variant proving the oracle can fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSecurityService, issueToken, signRequest } from '../src/service.mjs';
import { syntheticSecret } from './support.mjs';

const TOKEN_SECRET = syntheticSecret('token');
const SIGNING_SECRET = syntheticSecret('signing');
const T0 = Date.UTC(2026, 8, 25, 0, 0, 0);

async function withService(options, body) {
  let clock = T0;
  const logs = [];
  const service = createSecurityService({ tokenSecret: TOKEN_SECRET, signingSecret: SIGNING_SECRET, now: () => clock, log: line => logs.push(line), ...options });
  service.seed([
    { id: 'ord-a1', tenant: 'acme', owner: 'alice', note: 'acme spring order', total: 1200 },
    { id: 'ord-a2', tenant: 'acme', owner: 'alice', note: 'acme refill', total: 300 },
    { id: 'ord-b1', tenant: 'globex', owner: 'bob', note: 'globex confidential', total: 9900 },
  ]);
  const base = await service.listen();
  const token = claims => issueToken(TOKEN_SECRET, claims, { nowSeconds: Math.floor(clock / 1000) });
  const call = (path, { method = 'GET', bearer, headers = {}, body } = {}) => fetch(`${base}${path}`, {
    method, body, headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...headers },
  }).then(async response => ({ status: response.status, headers: response.headers, body: await response.json() }));
  try {
    return await body({ call, token, logs, advance: ms => { clock += ms; }, now: () => clock });
  } finally {
    await service.close();
  }
}

const alice = { sub: 'alice', tenant: 'acme', role: 'member' };
const bob = { sub: 'bob', tenant: 'globex', role: 'member' };
const admin = { sub: 'ops', tenant: 'acme', role: 'admin' };

test('AC-01 cross-tenant read returns the same 404 as a missing order', async () => {
  await withService({}, async ({ call, token }) => {
    const own = await call('/orders/ord-b1', { bearer: token(bob) });
    assert.equal(own.status, 200);
    const foreign = await call('/orders/ord-b1', { bearer: token(alice) });
    const missing = await call('/orders/ord-zz', { bearer: token(alice) });
    assert.equal(foreign.status, 404);
    assert.deepEqual(Object.keys(foreign.body).sort(), Object.keys(missing.body).sort());
    assert.equal(foreign.body.error, missing.body.error, 'no oracle distinguishes foreign from missing IDs');
    assert.doesNotMatch(JSON.stringify(foreign.body), /globex|9900|bob/);
  });
  await withService({ unsafe: { noTenantCheck: true } }, async ({ call, token }) => {
    assert.equal((await call('/orders/ord-b1', { bearer: token(alice) })).status, 200, 'oracle detects the missing tenant predicate');
  });
});

function signedRefund({ now, orderId = 'ord-a1', amount = 100, nonce = randomUUID(), timestamp = Math.floor(now() / 1000), card } = {}) {
  const body = JSON.stringify({ orderId, amount, ...(card ? { card } : {}) });
  return {
    body,
    headers: { 'x-timestamp': String(timestamp), 'x-nonce': nonce, 'x-signature': signRequest(SIGNING_SECRET, { method: 'POST', path: '/refunds', body, timestamp: String(timestamp), nonce }) },
  };
}

test('AC-02 non-admin cannot issue refunds', async () => {
  await withService({}, async ({ call, token, now }) => {
    const denied = await call('/refunds', { method: 'POST', bearer: token(alice), ...signedRefund({ now }) });
    assert.equal(denied.status, 403);
    const allowed = await call('/refunds', { method: 'POST', bearer: token(admin), ...signedRefund({ now }) });
    assert.equal(allowed.status, 202);
    const forgedRole = token({ ...alice, role: 'admin' }).split('.');
    forgedRole[1] = Buffer.from(JSON.stringify({ ...alice, role: 'admin', exp: 9e9 })).toString('base64url');
    assert.equal((await call('/refunds', { method: 'POST', bearer: forgedRole.join('.'), ...signedRefund({ now }) })).status, 401, 'role claim cannot be edited');
  });
  await withService({ unsafe: { noRoleCheck: true } }, async ({ call, token, now }) => {
    assert.equal((await call('/refunds', { method: 'POST', bearer: token(alice), ...signedRefund({ now }) })).status, 202, 'oracle detects the missing role check');
  });
});

test('AC-03 replayed, stale, or tampered refund requests are rejected', async () => {
  await withService({}, async ({ call, token, now, advance }) => {
    const bearer = token(admin);
    const request = signedRefund({ now });
    assert.equal((await call('/refunds', { method: 'POST', bearer, ...request })).status, 202);
    assert.equal((await call('/refunds', { method: 'POST', bearer, ...request })).status, 409, 'exact replay');
    const tampered = { ...signedRefund({ now }), body: JSON.stringify({ orderId: 'ord-a1', amount: 100_000 }) };
    assert.equal((await call('/refunds', { method: 'POST', bearer, ...tampered })).status, 409, 'body changed after signing');
    const stale = signedRefund({ now });
    advance(61_000);
    assert.equal((await call('/refunds', { method: 'POST', bearer: token(admin), ...stale })).status, 409, 'outside the 60 s window');
  });
  await withService({ unsafe: { noReplayCheck: true } }, async ({ call, token, now }) => {
    const request = signedRefund({ now });
    await call('/refunds', { method: 'POST', bearer: token(admin), ...request });
    assert.equal((await call('/refunds', { method: 'POST', bearer: token(admin), ...request })).status, 202, 'oracle detects a missing nonce store');
  });
});

test('AC-04 forged, tampered, expired, and alg=none tokens are unauthenticated', async () => {
  await withService({}, async ({ call, token, advance }) => {
    const valid = token(alice);
    const [header, payload] = valid.split('.');
    const none = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${payload}.`;
    const wrongKey = issueToken(syntheticSecret('attacker'), alice, { nowSeconds: Math.floor(T0 / 1000) });
    const tampered = `${header}.${Buffer.from(JSON.stringify({ ...alice, tenant: 'globex', exp: 9e9 })).toString('base64url')}.${valid.split('.')[2]}`;
    for (const [name, bearer] of [['missing', undefined], ['garbage', 'x.y'], ['alg none', none], ['wrong key', wrongKey], ['tampered tenant', tampered]]) {
      const response = await call('/orders/ord-a1', { bearer });
      assert.equal(response.status, 401, name);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    }
    assert.equal((await call('/orders/ord-a1', { bearer: valid })).status, 200);
    advance(301_000);
    assert.equal((await call('/orders/ord-a1', { bearer: valid })).status, 401, 'expired after ttl');
  });
});

const INJECTIONS = ["' OR '1'='1' --", "%' OR tenant='globex' --", "'; DROP TABLE orders; --", "\\' UNION SELECT id, tenant, total FROM orders --"];

test("AC-05 injection payloads stay inside the caller's tenant", async () => {
  await withService({}, async ({ call, token }) => {
    for (const q of INJECTIONS) {
      const response = await call(`/orders?q=${encodeURIComponent(q)}`, { bearer: token(alice) });
      assert.equal(response.status, 200, q);
      assert.deepEqual(response.body.orders, [], `payload is data, not SQL: ${q}`);
    }
    const all = await call('/orders?q=', { bearer: token(alice) });
    assert.deepEqual(all.body.orders.map(order => order.id), ['ord-a1', 'ord-a2'], 'table still intact, tenant filter still applied');
    assert.equal((await call(`/orders?q=${'a'.repeat(101)}`, { bearer: token(alice) })).status, 400);
  });
});

test("AC-05 control: string-built SQL leaks another tenant (oracle sanity)", async () => {
  await withService({ unsafe: { stringConcatSql: true } }, async ({ call, token }) => {
    const response = await call(`/orders?q=${encodeURIComponent(INJECTIONS[0])}`, { bearer: token(alice) });
    assert.equal(response.status, 200);
    assert.ok(response.body.orders.some(order => order.id === 'ord-b1'), 'the AC-05 oracle would catch this implementation');
  });
});

test('AC-06 one principal is throttled without affecting another', async () => {
  await withService({ rateLimit: { capacity: 5, refillPerSecond: 1 } }, async ({ call, token, advance }) => {
    const flood = await Promise.all(Array.from({ length: 8 }, () => call('/orders/ord-a1', { bearer: token(alice) })));
    const statuses = flood.map(response => response.status).sort();
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429, 429]);
    assert.equal(flood.find(response => response.status === 429).headers.get('retry-after'), '1');
    assert.equal((await call('/orders/ord-b1', { bearer: token(bob) })).status, 200, 'other principal unaffected');
    advance(1_000);
    assert.equal((await call('/orders/ord-a1', { bearer: token(alice) })).status, 200, 'bucket refills');
  });
  await withService({ rateLimit: { capacity: 5, refillPerSecond: 1 }, unsafe: { noRateLimit: true } }, async ({ call, token }) => {
    const flood = await Promise.all(Array.from({ length: 8 }, () => call('/orders/ord-a1', { bearer: token(alice) })));
    assert.ok(flood.every(response => response.status === 200), 'oracle detects a missing limiter');
  });
});

test('AC-07 audit log never contains tokens, signatures, or card numbers', async () => {
  await withService({}, async ({ call, token, logs, now }) => {
    const pan = '4111111111111111';
    const bearer = token(admin);
    await call('/orders/ord-a1', { bearer: `${bearer}x` });
    const request = signedRefund({ now, card: pan });
    await call('/refunds', { method: 'POST', bearer, ...request });
    await call('/refunds', { method: 'POST', bearer, ...request });
    const joined = logs.join('\n');
    assert.ok(logs.length >= 3, 'denials and refunds are audited');
    for (const secret of [bearer, request.headers['x-signature'], pan, TOKEN_SECRET, SIGNING_SECRET]) {
      assert.equal(joined.includes(secret), false, 'secret material must not reach logs');
    }
    assert.match(joined, /"card":"\[REDACTED\]"/);
    assert.match(joined, /"authorization":"\[REDACTED\]"/);
    for (const line of logs) assert.match(JSON.parse(line).correlationId, /^[0-9a-f-]{36}$/, 'every audit event is triageable by correlation ID');
  });
});

test('AC-08 API fuzz: malformed requests never yield 5xx or stack traces', async () => {
  await withService({ rateLimit: { capacity: 1_000, refillPerSecond: 1_000 } }, async ({ call, token, now }) => {
    const bearer = token(admin);
    const bodies = ['', '{', 'null', '[]', '{"orderId":1,"amount":"1"}', '{"orderId":"x","amount":-1}', '{"orderId":"x","amount":1e309}', '{"__proto__":{"admin":true}}', 'x'.repeat(20_000)];
    const paths = ['/orders/../../etc/passwd', '/orders/%00', `/orders/${'a'.repeat(65)}`, '/orders?q=%', '/nope', '/orders/ord-a1?q[]=1'];
    const responses = [];
    for (const body of bodies) {
      const signed = signedRefund({ now });
      const headers = { ...signed.headers, 'x-signature': signRequest(SIGNING_SECRET, { method: 'POST', path: '/refunds', body, timestamp: signed.headers['x-timestamp'], nonce: signed.headers['x-nonce'] }) };
      responses.push(await call('/refunds', { method: 'POST', bearer, headers, body }).catch(error => ({ status: 413, body: { error: error.cause?.code ?? 'reset' } })));
    }
    for (const path of paths) responses.push(await call(path, { bearer }));
    for (const response of responses) {
      assert.ok(response.status < 500, `no 5xx: ${JSON.stringify(response.body)}`);
      assert.doesNotMatch(JSON.stringify(response.body), /at .*\.mjs|Error:|SQLITE|stack/i);
    }
  });
});
