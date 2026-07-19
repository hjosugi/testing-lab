import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONSUMER_ORDER } from './pact-config.js';
import { verifyOrderProvider } from './provider-verification.js';

function checkoutResponse(overrides = {}) {
  return async command => ({
    orderId: command.orderId,
    total: CONSUMER_ORDER.total,
    status: CONSUMER_ORDER.status,
    paymentId: 'pay-pact-1',
    ...overrides,
  });
}

test('[contract/pact-provider] production provider satisfies the consumer contract', async () => {
  const verification = await verifyOrderProvider();

  assert.equal(verification.providerStateSetups, 1);
});

test('[contract/pact-provider] breaking provider response is rejected', async () => {
  await assert.rejects(
    verifyOrderProvider({
      checkout: checkoutResponse({ status: 'PENDING' }),
    }),
    /pact/i,
  );
});

test('[contract/pact-provider] irrelevant provider fields remain compatible', async () => {
  const verification = await verifyOrderProvider({
    checkout: checkoutResponse({
      auditId: 'audit-not-used-by-checkout-web',
    }),
  });

  assert.equal(verification.providerStateSetups, 1);
});
