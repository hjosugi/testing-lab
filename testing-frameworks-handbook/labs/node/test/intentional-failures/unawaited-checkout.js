export const failureSentinel = 'UNAWAITED_CHECKOUT_FAILURE';

export function startCheckoutWithoutAwaiting() {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(failureSentinel));
    }, 10);
  });
}
