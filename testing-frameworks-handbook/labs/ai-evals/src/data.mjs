// Data-quality checks and an event-time aggregation that is idempotent under
// duplicate, late, and out-of-order delivery.

export function checkSchema(rows, schema) {
  const failures = [];
  rows.forEach((row, index) => {
    for (const [field, rule] of Object.entries(schema)) {
      const value = row[field];
      if (value === null || value === undefined) {
        if (!rule.nullable) failures.push({ index, field, check: 'not-null' });
        continue;
      }
      if (rule.type === 'integer' && !Number.isSafeInteger(value)) failures.push({ index, field, check: 'type' });
      if (rule.type === 'string' && typeof value !== 'string') failures.push({ index, field, check: 'type' });
      if (rule.min !== undefined && value < rule.min) failures.push({ index, field, check: 'range' });
      if (rule.max !== undefined && value > rule.max) failures.push({ index, field, check: 'range' });
      if (rule.enum && !rule.enum.includes(value)) failures.push({ index, field, check: 'enum' });
    }
  });
  return failures;
}

export function checkUnique(rows, key) {
  const seen = new Map();
  const duplicates = [];
  rows.forEach((row, index) => {
    if (seen.has(row[key])) duplicates.push({ key: row[key], first: seen.get(row[key]), again: index });
    else seen.set(row[key], index);
  });
  return duplicates;
}

// Reconciliation: order totals must equal the sum of their lines, and every
// line must belong to a known order.
export function reconcile(orders, lines) {
  const sums = new Map();
  const orphans = [];
  const ids = new Set(orders.map(order => order.orderId));
  for (const line of lines) {
    if (!ids.has(line.orderId)) orphans.push(line.lineId);
    sums.set(line.orderId, (sums.get(line.orderId) ?? 0) + line.quantity * line.unitPrice);
  }
  const mismatched = orders.filter(order => (sums.get(order.orderId) ?? 0) !== order.total).map(order => order.orderId);
  return { mismatched, orphans };
}

// Tumbling event-time windows with a watermark (max event time seen minus
// allowedLatenessMs). Duplicates are dropped by eventId; events older than the
// watermark for an already-closed window go to `late` instead of silently
// changing a published result.
export function aggregateRevenue(events, { windowMs = 60_000, allowedLatenessMs = 30_000 } = {}) {
  const seen = new Set();
  const windows = new Map();
  const closed = new Set();
  const late = [];
  let watermark = -Infinity;
  for (const event of events) {
    if (seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    const window = Math.floor(event.eventTime / windowMs) * windowMs;
    if (closed.has(window)) {
      late.push(event.eventId);
      continue;
    }
    windows.set(window, (windows.get(window) ?? 0) + event.amount);
    watermark = Math.max(watermark, event.eventTime - allowedLatenessMs);
    for (const start of windows.keys()) if (start + windowMs <= watermark) closed.add(start);
  }
  return { revenue: Object.fromEntries([...windows.entries()].sort(([a], [b]) => a - b)), late: late.sort() };
}
