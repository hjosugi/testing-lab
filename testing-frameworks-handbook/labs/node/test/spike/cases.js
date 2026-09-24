// The five common cases of the runner selection spike (Issue #31/#50),
// written once and bound to each runner by a thin adapter so only the runner
// differs: async, expected failure, parameterized, parallel isolation, and an
// intentional diagnostic failure (enabled only by SPIKE_INTENTIONAL=1).
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CartItem, CheckoutService, PaymentError } from '../../src/checkout.js';

const service = (overrides = {}) => new CheckoutService({
  payments: { capture: async total => { if (overrides.decline) throw new PaymentError('declined'); return `pay-${total}`; } },
  orders: { save: async order => { overrides.saved?.push(order); } },
});

export const CARTS = Object.freeze([
  { name: 'one line', items: [['book', 2, 600]], total: 1200 },
  { name: 'two lines', items: [['a', 1, 100], ['b', 3, 50]], total: 250 },
  { name: 'free item', items: [['gift', 1, 0]], total: 0 },
]);

export const cases = {
  async asyncCheckout() {
    const saved = [];
    const order = await service({ saved }).checkout({ orderId: 'o-1', items: [new CartItem('book', 2, 600)], token: 't' });
    return { actual: { order, saved: saved.length }, expected: { order: { orderId: 'o-1', total: 1200, status: 'CONFIRMED', paymentId: 'pay-1200' }, saved: 1 } };
  },
  async declinedPayment() {
    const saved = [];
    let error;
    try { await service({ decline: true, saved }).checkout({ orderId: 'o-2', items: [new CartItem('book', 1, 600)], token: 't' }); } catch (caught) { error = caught; }
    return { actual: { errorType: error?.constructor.name, saved: saved.length }, expected: { errorType: 'PaymentError', saved: 0 } };
  },
  async parameterized(cart) {
    const order = await service().checkout({ orderId: cart.name, items: cart.items.map(([sku, q, p]) => new CartItem(sku, q, p)), token: 't' });
    return { actual: order.total, expected: cart.total };
  },
  // Each test owns a temp directory; running the two workers in parallel must
  // never observe the other's receipt.
  async isolatedReceipt(worker) {
    const dir = await mkdtemp(join(tmpdir(), `runner-spike-${worker}-`));
    try {
      const path = join(dir, 'receipt.txt');
      await writeFile(path, `receipt for ${worker}`);
      await new Promise(resolve => setTimeout(resolve, 20));
      return { actual: await readFile(path, 'utf8'), expected: `receipt for ${worker}` };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  async diagnosticFailure() {
    const order = await service().checkout({ orderId: 'o-3', items: [new CartItem('book', 3, 600)], token: 't' });
    // Intentionally wrong expectation: total and paymentId differ.
    return { actual: order, expected: { orderId: 'o-3', total: 1500, status: 'CONFIRMED', paymentId: 'pay-1500' } };
  },
};

export const intentional = process.env.SPIKE_INTENTIONAL === '1';
