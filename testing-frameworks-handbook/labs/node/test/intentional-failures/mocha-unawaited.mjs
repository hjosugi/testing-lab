import { startCheckoutWithoutAwaiting } from './unawaited-checkout.js';

it('INCORRECT: checkout promise is not returned or awaited', () => {
  void startCheckoutWithoutAwaiting();
});
