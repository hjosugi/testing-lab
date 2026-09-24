// Test-data factory: minimal valid objects with meaningful defaults,
// namespaced IDs so parallel runs never collide, synthetic-only personal
// data, and a manifest of the clock, seed, and locale that produced it.
import { createHash } from 'node:crypto';

export const TEST_PANS = Object.freeze(['4111111111111111', '5555555555554444']);
const FAMILY = ['テスト', 'サンプル', 'Example'];
const GIVEN = ['太郎', '花子', 'Alex'];

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFactory({ runId, worker = 'w0', seed = 1, clockStart = '2026-09-25T00:00:00Z', locale = 'ja-JP', timeZone = 'Asia/Tokyo' }) {
  if (!/^[a-z0-9-]{3,32}$/.test(runId)) throw new TypeError('runId must be a short slug');
  const random = mulberry32(seed);
  let sequence = 0;
  let clock = Date.parse(clockStart);
  const namespace = `t-${runId}-${worker}`;
  const next = kind => `${namespace}-${kind}-${String(++sequence).padStart(4, '0')}`;
  const pick = list => list[Math.floor(random() * list.length)];
  const tick = () => new Date((clock += 1_000)).toISOString();

  const customer = (overrides = {}) => {
    const id = next('cus');
    return { id, tenant: namespace, name: `${pick(FAMILY)} ${pick(GIVEN)}`, email: `${id}@example.test`, locale, createdAt: tick(), ...overrides };
  };
  // Meaningful default: a confirmed one-line order that passes validation.
  const order = (overrides = {}) => {
    const owner = overrides.customer ?? customer();
    const { customer: _ignored, ...rest } = overrides;
    const lines = rest.lines ?? [{ sku: 'book', quantity: 1, unitPrice: 1_200 }];
    return {
      id: next('ord'),
      tenant: namespace,
      customerId: owner.id,
      status: 'CONFIRMED',
      currency: 'JPY',
      lines,
      total: lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
      card: { number: pick(TEST_PANS), holder: owner.name },
      createdAt: tick(),
      ...rest,
    };
  };
  return {
    namespace,
    customer,
    order,
    manifest: () => ({ runId, worker, namespace, seed, clockStart, locale, timeZone, generated: sequence }),
  };
}

// Production data is never copied into tests. When a production-shaped
// sample is unavoidable (e.g. a bug reproduction), it goes through this
// irreversible transform first: identifiers are pseudonymized with a
// per-run salt, contact data replaced, cards dropped, dates generalized.
export function anonymize(row, { salt }) {
  const pseudonym = value => `anon-${createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 12)}`;
  return {
    id: pseudonym(row.id),
    customerId: pseudonym(row.customerId),
    email: `${pseudonym(row.email)}@example.test`,
    name: '匿名',
    birthYear: row.birthDate ? Number(row.birthDate.slice(0, 4)) : undefined,
    prefecture: row.address?.prefecture,
    total: row.total,
    lines: row.lines?.map(({ sku, quantity, unitPrice }) => ({ sku, quantity, unitPrice })),
  };
}

// Guard used by fixtures and factories: rejects anything that looks real.
export function assertSynthetic(record) {
  const text = JSON.stringify(record);
  for (const email of text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []) {
    if (!/@example\.(test|com|org|net)$/.test(email)) throw new Error(`non-reserved email domain: ${email.split('@')[1]}`);
  }
  for (const digits of text.match(/\b\d{13,19}\b/g) ?? []) {
    if (!TEST_PANS.includes(digits)) throw new Error('card-like number that is not a network test PAN');
  }
  if (/\b0\d0-?\d{4}-?\d{4}\b/.test(text)) throw new Error('phone-number-like value');
  return record;
}
