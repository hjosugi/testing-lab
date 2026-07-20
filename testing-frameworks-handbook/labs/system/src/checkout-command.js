const CHECKOUT_ITEMS = Object.freeze([
  Object.freeze({ sku: 'book', quantity: 2, unitPrice: 600 }),
]);

function systemRandomUUID() {
  return globalThis.crypto.randomUUID();
}

export function createCheckoutCommand({
  randomUUID = systemRandomUUID,
} = {}) {
  if (typeof randomUUID !== 'function') {
    throw new TypeError('randomUUID must be a function');
  }

  return Object.freeze({
    orderId: `order-${randomUUID()}`,
    token: 't-1',
    items: CHECKOUT_ITEMS,
  });
}
