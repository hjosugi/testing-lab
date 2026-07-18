import test from 'ava';
import { startCheckoutWithoutAwaiting } from './unawaited-checkout.js';

test('INCORRECT: checkout promise is not returned or awaited', t => {
  void startCheckoutWithoutAwaiting();
  t.pass();
});
