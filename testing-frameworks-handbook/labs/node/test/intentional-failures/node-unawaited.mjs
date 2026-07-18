import { test } from 'node:test';
import { startCheckoutWithoutAwaiting } from './unawaited-checkout.js';

test('INCORRECT: checkout promise is not returned or awaited', () => {
  void startCheckoutWithoutAwaiting();
});
