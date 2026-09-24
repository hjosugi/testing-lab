// Checkout service in two versions plus the production-verification
// machinery around it: weighted canary routing, feature-flag cohorts with a
// kill switch, synthetic accounts, sanitized shadow traffic, and runtime
// business invariants.
import { createHash } from 'node:crypto';

const bucketOf = (key, salt) => parseInt(createHash('sha256').update(`${salt}:${key}`).digest('hex').slice(0, 8), 16) % 10_000;

// v2 adds a "bundle discount" behind a flag; it has a defect: the discount is
// applied twice for carts with 3+ lines (total drifts below lines - discount).
export const versions = {
  v1: order => {
    const subtotal = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    return { subtotal, discount: 0, total: subtotal };
  },
  v2: (order, { bundleDiscount }) => {
    const subtotal = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discount = bundleDiscount && order.lines.length >= 2 ? Math.floor(subtotal * 0.05) : 0;
    const buggyExtra = bundleDiscount && order.lines.length >= 3 ? discount : 0;
    return { subtotal, discount, total: subtotal - discount - buggyExtra };
  },
};

export function createRouter({ canaryPercent = 0, flag = { name: 'bundle-discount', cohortPercent: 0, killSwitch: false } } = {}) {
  const state = { canaryPercent, flag: { ...flag } };
  return {
    state,
    route(customerId) {
      const version = bucketOf(customerId, 'canary') < state.canaryPercent * 100 ? 'v2' : 'v1';
      const bundleDiscount = !state.flag.killSwitch && bucketOf(customerId, state.flag.name) < state.flag.cohortPercent * 100;
      return { version, bundleDiscount };
    },
    rollback() { state.canaryPercent = 0; },
    kill() { state.flag.killSwitch = true; },
  };
}

// Runtime invariant: total = subtotal - discount, and 0 <= discount <= subtotal.
export function invariantViolations(order, result) {
  const violations = [];
  const lines = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  if (result.subtotal !== lines) violations.push('subtotal != sum(lines)');
  if (result.discount < 0 || result.discount > result.subtotal) violations.push('discount out of range');
  if (result.total !== result.subtotal - result.discount) violations.push('total != subtotal - discount');
  return violations;
}

// Synthetic accounts are tagged, excluded from business metrics, and cleaned
// up idempotently by tag.
export function createStore() {
  const orders = new Map();
  return {
    orders,
    save(order) { orders.set(order.id, order); },
    businessOrders: () => [...orders.values()].filter(order => !order.synthetic),
    cleanupSynthetic() {
      let removed = 0;
      for (const [id, order] of orders) if (order.synthetic) { orders.delete(id); removed += 1; }
      return removed;
    },
  };
}

// Shadow: mirror a sanitized copy to the candidate, never persist, compare.
export function sanitizeForShadow(order) {
  return {
    id: `shadow-${createHash('sha256').update(order.id).digest('hex').slice(0, 10)}`,
    customerId: createHash('sha256').update(order.customerId).digest('hex').slice(0, 16),
    lines: order.lines.map(({ sku, quantity, unitPrice }) => ({ sku, quantity, unitPrice })),
  };
}

export function shadowCompare(orders, { candidate = versions.v2, flags = { bundleDiscount: true } } = {}) {
  const diffs = [];
  const mirrored = [];
  let changedTotals = 0;
  for (const order of orders) {
    const copy = sanitizeForShadow(order);
    mirrored.push(copy);
    const primary = versions.v1(order);
    const shadow = candidate(copy, flags);
    if (shadow.total !== primary.total) changedTotals += 1; // expected: the new discount
    const violations = invariantViolations(copy, shadow);
    if (violations.length > 0) diffs.push({ id: copy.id, lines: copy.lines.length, violations });
  }
  return { mirrored, diffs, changedTotals };
}
