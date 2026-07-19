import { Verifier } from '@pact-foundation/pact';
import {
  createApp,
  createInMemoryOrderStore,
} from '../../src/app.js';
import { listen } from '../helpers.js';
import {
  PACT_FILE,
  PACT_PROVIDER_STATE,
} from './pact-config.js';

export async function verifyOrderProvider({ checkout } = {}) {
  const orderStore = createInMemoryOrderStore();
  let providerStateSetups = 0;
  const app = await listen(createApp({ checkout, orderStore }));

  try {
    const output = await new Verifier({
      providerBaseUrl: app.baseUrl,
      pactUrls: [PACT_FILE],
      stateHandlers: {
        [PACT_PROVIDER_STATE]: {
          setup: async () => {
            providerStateSetups += 1;
            await orderStore.clear();
          },
        },
      },
      logLevel: 'error',
    }).verifyProvider();

    return { output, providerStateSetups };
  } finally {
    await app.close();
  }
}
