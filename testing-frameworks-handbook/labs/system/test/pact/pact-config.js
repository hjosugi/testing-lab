import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));

export const PACT_CONSUMER = 'Checkout Web';
export const PACT_PROVIDER = 'Order API';
export const PACT_PROVIDER_STATE = 'checkout can be confirmed';
export const PACT_INTERACTION = 'a checkout confirmation request';
export const PACT_ARTIFACT_DIRECTORY = resolve(
  TEST_DIRECTORY,
  '../../.pact-artifacts',
);
export const PACT_FILE_NAME = `${PACT_CONSUMER}-${PACT_PROVIDER}.json`;
export const PACT_FILE = join(PACT_ARTIFACT_DIRECTORY, PACT_FILE_NAME);

export const CHECKOUT_COMMAND = Object.freeze({
  orderId: 'pact-order-1',
  token: 'pact-token-1',
  items: Object.freeze([
    Object.freeze({ sku: 'book', quantity: 2, unitPrice: 600 }),
  ]),
});

export const CONSUMER_ORDER = Object.freeze({
  orderId: 'pact-order-1',
  total: 1200,
  status: 'CONFIRMED',
});
