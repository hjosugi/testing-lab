// Multi-tenant order API used as the system under threat. Every control that
// threat-model.json relies on lives here so abuse-case tests exercise the real
// HTTP boundary: signed bearer tokens, tenant/role authorization, parameterized
// SQL, signed-request replay protection, per-principal rate limiting, and log
// redaction. `unsafe` switches exist only so tests can prove each oracle fails
// when its control is removed.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export function issueToken(secret, claims, { nowSeconds = Math.floor(Date.now() / 1000), ttlSeconds = 300 } = {}) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ ...claims, iat: nowSeconds, exp: nowSeconds + ttlSeconds });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(secret, token, nowSeconds) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  let parsedHeader;
  let claims;
  try {
    parsedHeader = JSON.parse(Buffer.from(header, 'base64url'));
    claims = JSON.parse(Buffer.from(payload, 'base64url'));
  } catch {
    return null;
  }
  if (parsedHeader.alg !== 'HS256') return null; // rejects alg=none and algorithm confusion
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null;
  if (typeof claims.sub !== 'string' || typeof claims.tenant !== 'string') return null;
  return claims;
}

export function signRequest(secret, { method, path, body, timestamp, nonce }) {
  return createHmac('sha256', secret).update([method, path, timestamp, nonce, body].join('\n')).digest('hex');
}

const SECRET_KEY = /token|password|secret|authorization|card|cvv/i;
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : redact(item)]));
  }
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[\w.-]+/g, 'Bearer [REDACTED]')
      .replace(/\b\d{13,19}\b/g, '[PAN-REDACTED]');
  }
  return value;
}

export function createSecurityService({
  tokenSecret,
  signingSecret,
  now = () => Date.now(),
  rateLimit = { capacity: 10, refillPerSecond: 5 },
  replayWindowSeconds = 60,
  unsafe = {},
  log = () => {},
}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE orders (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, owner TEXT NOT NULL, note TEXT NOT NULL, total INTEGER NOT NULL)`);
  const insert = db.prepare('INSERT INTO orders (id, tenant, owner, note, total) VALUES (?, ?, ?, ?, ?)');
  const byId = db.prepare('SELECT id, tenant, owner, note, total FROM orders WHERE id = ? AND tenant = ?');
  const search = db.prepare('SELECT id, note, total FROM orders WHERE tenant = ? AND note LIKE ? ORDER BY id');
  const seenNonces = new Map();
  const buckets = new Map();

  const audit = entry => log(JSON.stringify(redact({ at: new Date(now()).toISOString(), ...entry })));

  const allow = principal => {
    if (unsafe.noRateLimit) return true;
    const nowMs = now();
    const bucket = buckets.get(principal) ?? { tokens: rateLimit.capacity, at: nowMs };
    bucket.tokens = Math.min(rateLimit.capacity, bucket.tokens + ((nowMs - bucket.at) / 1000) * rateLimit.refillPerSecond);
    bucket.at = nowMs;
    buckets.set(principal, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  };

  const send = (response, status, body, headers = {}) => {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
    response.end(JSON.stringify(body));
  };

  const handle = (request, response, body) => {
    const url = new URL(request.url, 'http://service.local');
    const correlationId = randomUUID();
    const token = (request.headers.authorization ?? '').replace(/^Bearer\s+/, '');
    const claims = verifyToken(tokenSecret, token, Math.floor(now() / 1000));
    if (!claims) {
      audit({ event: 'authn.denied', correlationId, path: url.pathname, authorization: request.headers.authorization });
      return send(response, 401, { error: 'unauthenticated', correlationId }, { 'www-authenticate': 'Bearer' });
    }
    if (!allow(`${claims.tenant}/${claims.sub}`)) {
      audit({ event: 'rate.limited', correlationId, sub: claims.sub });
      return send(response, 429, { error: 'rate_limited', correlationId }, { 'retry-after': '1' });
    }

    const order = url.pathname.match(/^\/orders\/([\w-]{1,64})$/);
    if (request.method === 'GET' && order) {
      const row = unsafe.noTenantCheck
        ? db.prepare('SELECT id, tenant, owner, note, total FROM orders WHERE id = ?').get(order[1])
        : byId.get(order[1], claims.tenant);
      // Same 404 for "missing" and "other tenant" so IDs cannot be probed.
      if (!row) return send(response, 404, { error: 'not_found', correlationId });
      return send(response, 200, { id: row.id, owner: row.owner, note: row.note, total: row.total });
    }

    if (request.method === 'GET' && url.pathname === '/orders') {
      const q = url.searchParams.get('q') ?? '';
      if (q.length > 100) return send(response, 400, { error: 'query_too_long', correlationId });
      const rows = unsafe.stringConcatSql
        ? db.prepare(`SELECT id, note, total FROM orders WHERE tenant = '${claims.tenant}' AND note LIKE '%${q}%' ORDER BY id`).all()
        : search.all(claims.tenant, `%${q}%`);
      return send(response, 200, { orders: rows.map(row => ({ ...row })) });
    }

    if (request.method === 'POST' && url.pathname === '/refunds') {
      if (!unsafe.noRoleCheck && claims.role !== 'admin') {
        audit({ event: 'authz.denied', correlationId, sub: claims.sub, action: 'refund' });
        return send(response, 403, { error: 'forbidden', correlationId });
      }
      const timestamp = request.headers['x-timestamp'];
      const nonce = request.headers['x-nonce'];
      const signature = request.headers['x-signature'];
      const expected = signRequest(signingSecret, { method: 'POST', path: url.pathname, body, timestamp, nonce });
      const fresh = Math.abs(now() / 1000 - Number(timestamp)) <= replayWindowSeconds;
      const validSignature = typeof signature === 'string' && signature.length === expected.length
        && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!validSignature || !fresh || (!unsafe.noReplayCheck && seenNonces.has(nonce))) {
        audit({ event: 'refund.rejected', correlationId, reason: !validSignature ? 'signature' : !fresh ? 'stale' : 'replay' });
        return send(response, 409, { error: 'rejected', correlationId });
      }
      seenNonces.set(nonce, now());
      let refund;
      try {
        refund = JSON.parse(body);
      } catch {
        return send(response, 400, { error: 'invalid_json', correlationId });
      }
      // Found by the AC-08 fuzz: a JSON `null` body used to reach property
      // access and surface as a 500.
      if (refund === null || typeof refund !== 'object' || Array.isArray(refund)
        || !Number.isSafeInteger(refund.amount) || refund.amount <= 0 || typeof refund.orderId !== 'string') {
        return send(response, 400, { error: 'invalid_refund', correlationId });
      }
      audit({ event: 'refund.accepted', correlationId, sub: claims.sub, orderId: refund.orderId, amount: refund.amount, card: refund.card });
      return send(response, 202, { status: 'accepted', correlationId });
    }
    return send(response, 404, { error: 'not_found', correlationId });
  };

  const server = createServer((request, response) => {
    let body = '';
    let size = 0;
    request.setEncoding('utf8');
    request.on('data', chunk => {
      size += chunk.length;
      if (size > 16_384) {
        send(response, 413, { error: 'payload_too_large' });
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        handle(request, response, body);
      } catch (error) {
        const correlationId = randomUUID();
        audit({ event: 'internal.error', correlationId, name: error.name });
        send(response, 500, { error: 'internal', correlationId });
      }
    });
  });

  return {
    seed(orders) { for (const o of orders) insert.run(o.id, o.tenant, o.owner, o.note, o.total); },
    async listen() {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      db.close();
    },
  };
}
