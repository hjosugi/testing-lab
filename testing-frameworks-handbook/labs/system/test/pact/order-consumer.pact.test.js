import assert from 'node:assert/strict';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { test } from 'node:test';
import {
  Matchers,
  Pact,
  SpecificationVersion,
} from '@pact-foundation/pact';
import { createOrderClient } from '../../src/order-client.js';
import {
  CHECKOUT_COMMAND,
  CONSUMER_ORDER,
  PACT_ARTIFACT_DIRECTORY,
  PACT_CONSUMER,
  PACT_FILE,
  PACT_INTERACTION,
  PACT_PROVIDER,
  PACT_PROVIDER_STATE,
} from './pact-config.js';

async function resetGeneratedPact() {
  await mkdir(PACT_ARTIFACT_DIRECTORY, { recursive: true });
  await rm(PACT_FILE, { force: true });
}

test('[contract/pact-consumer] the real order client generates its minimal contract', async () => {
  await resetGeneratedPact();
  const pact = new Pact({
    consumer: PACT_CONSUMER,
    provider: PACT_PROVIDER,
    dir: PACT_ARTIFACT_DIRECTORY,
    spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
    logLevel: 'error',
  });

  await pact
    .addInteraction()
    .given(PACT_PROVIDER_STATE)
    .uponReceiving(PACT_INTERACTION)
    .withRequest('POST', '/orders', request => {
      request.jsonBody(CHECKOUT_COMMAND);
    })
    .willRespondWith(201, response => {
      response.jsonBody({
        orderId: CONSUMER_ORDER.orderId,
        total: Matchers.integer(CONSUMER_ORDER.total),
        status: CONSUMER_ORDER.status,
      });
    })
    .executeTest(async mockServer => {
      const client = createOrderClient({ baseUrl: mockServer.url });
      assert.deepEqual(
        await client.confirmOrder(CHECKOUT_COMMAND),
        CONSUMER_ORDER,
      );
    });

  const contract = JSON.parse(await readFile(PACT_FILE, 'utf8'));
  assert.equal(contract.consumer.name, PACT_CONSUMER);
  assert.equal(contract.provider.name, PACT_PROVIDER);
  assert.equal(contract.interactions.length, 1);
  const [interaction] = contract.interactions;

  assert.deepEqual(
    interaction.providerStates,
    [{ name: PACT_PROVIDER_STATE }],
  );
  assert.equal(interaction.response.status, 201);
  assert.equal(
    interaction.response.body.content.status,
    CONSUMER_ORDER.status,
  );
  assert.deepEqual(
    Object.keys(interaction.response.body.content).sort(),
    ['orderId', 'status', 'total'],
  );
  assert.deepEqual(Object.keys(interaction.response.matchingRules), ['body']);
  assert.deepEqual(
    Object.keys(interaction.response.matchingRules.body),
    ['$.total'],
  );
});
