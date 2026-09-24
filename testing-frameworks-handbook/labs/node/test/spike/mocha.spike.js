import assert from 'node:assert/strict';
import { CARTS, cases, intentional } from './cases.js';

describe('runner spike (Mocha)', () => {
  it('async checkout', async () => { const { actual, expected } = await cases.asyncCheckout(); assert.deepEqual(actual, expected); });
  it('declined payment', async () => { const { actual, expected } = await cases.declinedPayment(); assert.deepEqual(actual, expected); });
  for (const cart of CARTS) it(`parameterized: ${cart.name}`, async () => { const { actual, expected } = await cases.parameterized(cart); assert.equal(actual, expected); });
  // Mocha runs tests in a file serially; parallelism is per file (--parallel).
  it('parallel isolation', async () => {
    const results = await Promise.all(['w1', 'w2'].map(worker => cases.isolatedReceipt(worker)));
    for (const { actual, expected } of results) assert.equal(actual, expected);
  });
  (intentional ? it : it.skip)('diagnostic failure', async () => { const { actual, expected } = await cases.diagnosticFailure(); assert.deepEqual(actual, expected); });
});
