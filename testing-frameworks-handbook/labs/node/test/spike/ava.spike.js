import test from 'ava';
import { CARTS, cases, intentional } from './cases.js';

test('async checkout', async t => { const { actual, expected } = await cases.asyncCheckout(); t.deepEqual(actual, expected); });
test('declined payment', async t => { const { actual, expected } = await cases.declinedPayment(); t.deepEqual(actual, expected); });
for (const cart of CARTS) test(`parameterized: ${cart.name}`, async t => { const { actual, expected } = await cases.parameterized(cart); t.is(actual, expected); });
// AVA runs tests in a file concurrently by default.
for (const worker of ['w1', 'w2']) test(`parallel isolation ${worker}`, async t => { const { actual, expected } = await cases.isolatedReceipt(worker); t.is(actual, expected); });
(intentional ? test : test.skip)('diagnostic failure', async t => { const { actual, expected } = await cases.diagnosticFailure(); t.deepEqual(actual, expected); });
