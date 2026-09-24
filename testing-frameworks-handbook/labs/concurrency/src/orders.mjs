// Async order store with the two classic concurrency bugs and their fixes:
// check-then-act duplicate checkout (fixed by an idempotency key with a
// unique constraint) and lost update on stock (fixed by optimistic
// concurrency: compare version on write). `pause` is a test seam that lets
// a barrier line up concurrent requests at the critical point.
export function createStore({ stock = 1, pause = async () => {} } = {}) {
  const orders = [];
  const byKey = new Map();
  let item = { stock, version: 1 };
  return {
    orders,
    get stock() { return item.stock; },
    async checkoutUnsafe({ customer }) {
      const exists = orders.some(order => order.customer === customer);
      await pause('after-check');
      if (!exists) orders.push({ customer });
      const { stock: seen } = item;
      await pause('after-read');
      if (seen > 0) item = { stock: seen - 1, version: item.version + 1 };
    },
    async checkoutSafe({ customer, idempotencyKey }) {
      await pause('after-check');
      if (byKey.has(idempotencyKey)) return byKey.get(idempotencyKey); // unique constraint
      const pending = (async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { stock: seen, version } = item;
          await pause('after-read');
          if (seen <= 0) return { status: 'sold-out' };
          if (item.version !== version) continue; // optimistic concurrency: retry
          item = { stock: seen - 1, version: version + 1 };
          orders.push({ customer });
          return { status: 'confirmed' };
        }
        return { status: 'conflict' };
      })();
      byKey.set(idempotencyKey, pending);
      return pending;
    },
  };
}

// Promise barrier: releases all waiters once `parties` have arrived.
export function createBarrier(parties) {
  let arrived = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  return async () => {
    arrived += 1;
    if (arrived === parties) release();
    await gate;
  };
}
