import test from 'node:test';
import assert from 'node:assert/strict';
import { CARTS, cases, intentional } from './cases.js';

test('async checkout', async () => { const { actual, expected } = await cases.asyncCheckout(); assert.deepEqual(actual, expected); });
test('declined payment', async () => { const { actual, expected } = await cases.declinedPayment(); assert.deepEqual(actual, expected); });
for (const cart of CARTS) test(`parameterized: ${cart.name}`, async () => { const { actual, expected } = await cases.parameterized(cart); assert.equal(actual, expected); });
test('parallel isolation', { concurrency: 2 }, async t => {
  await Promise.all(['w1', 'w2'].map(worker => t.test(worker, async () => { const { actual, expected } = await cases.isolatedReceipt(worker); assert.equal(actual, expected); })));
});
test('diagnostic failure', { skip: !intentional }, async () => { const { actual, expected } = await cases.diagnosticFailure(); assert.deepEqual(actual, expected); });
