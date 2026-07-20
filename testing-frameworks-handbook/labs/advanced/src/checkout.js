export function totalOf(items) {
  return items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) throw new TypeError('unitPrice must be a non-negative safe integer');
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new TypeError('quantity must be a positive safe integer');
    const subtotal = item.unitPrice * item.quantity;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(sum + subtotal)) {
      throw new RangeError('total must be a safe integer');
    }
    return sum + subtotal;
  }, 0);
}

export function referenceTotal(items) {
  let sum = 0;
  for (const item of items) {
    for (let n = 0; n < item.quantity; n += 1) sum += item.unitPrice;
  }
  return sum;
}

export function discountedTotal(items, basisPoints) {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) throw new RangeError('invalid discount');
  return Math.floor(totalOf(items) * (10_000 - basisPoints) / 10_000);
}

export function canonicalizeCart(items) {
  const lines = new Map();
  for (const item of items) {
    totalOf([item]);
    const key = JSON.stringify([item.sku, item.unitPrice]);
    const quantity = (lines.get(key)?.quantity ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity)) throw new RangeError('quantity must be a safe integer');
    lines.set(key, { sku: item.sku, quantity, unitPrice: item.unitPrice });
  }
  return [...lines.values()].sort((left, right) => {
    if (left.sku < right.sku) return -1;
    if (left.sku > right.sku) return 1;
    return left.unitPrice - right.unitPrice;
  });
}

export class Order {
  #state = 'NEW';
  #paymentKeys = new Set();

  get state() { return this.#state; }

  reserve() {
    if (this.#state !== 'NEW') throw new Error('only a new order can be reserved');
    this.#state = 'RESERVED';
  }

  pay(idempotencyKey) {
    if (this.#paymentKeys.has(idempotencyKey)) return;
    if (this.#state !== 'RESERVED') throw new Error('only a reserved order can be paid');
    this.#paymentKeys.add(idempotencyKey);
    this.#state = 'PAID';
  }
}

export function idempotent(operation) {
  const inFlight = new Map();
  return (key) => {
    if (!inFlight.has(key)) {
      const result = Promise.resolve().then(() => operation(key));
      inFlight.set(key, result);
    }
    return inFlight.get(key);
  };
}

export async function retry(operation, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) { lastError = error; }
  }
  throw lastError;
}

export function renderReceipt(orderId, items) {
  const lines = items.map(({ sku, quantity, unitPrice }) => `${sku} x${quantity} = ${quantity * unitPrice}`);
  return [`ORDER ${orderId}`, ...lines, `TOTAL ${totalOf(items)}`].join('\n');
}

export function sanitize(value) {
  const secret = /token|password|card(number)?|authorization/i;
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secret.test(key) ? '[REDACTED]' : sanitize(item)]));
  }
  return value;
}

// Legacy behavior intentionally kept for the characterization exercise.
export function legacyShippingFee(subtotal) {
  if (subtotal > 5_000) return 0;
  return subtotal % 2 === 0 ? 500 : 501;
}
