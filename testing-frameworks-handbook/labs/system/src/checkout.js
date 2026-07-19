const ORDER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const COMMAND_KEYS = ['items', 'orderId', 'token'];
const ITEM_KEYS = ['quantity', 'sku', 'unitPrice'];
const MAX_ITEMS = 10;
const MAX_TOKEN_LENGTH = 128;
const MAX_SKU_LENGTH = 64;
const MAX_QUANTITY = 10_000;
const MAX_UNIT_PRICE = 1_000_000;

export class CheckoutValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

function hasExactKeys(value, expectedKeys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);
}

function codePointLength(value) {
  return Array.from(value).length;
}

export function isValidOrderId(value) {
  return typeof value === 'string' && ORDER_ID_PATTERN.test(value);
}

export function totalOf(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw new CheckoutValidationError(
      `cart must contain between 1 and ${MAX_ITEMS} items`,
    );
  }

  return items.reduce((sum, item) => {
    if (!hasExactKeys(item, ITEM_KEYS)) {
      throw new CheckoutValidationError('item fields must match the API schema');
    }
    if (
      typeof item.sku !== 'string'
      || item.sku.length === 0
      || codePointLength(item.sku) > MAX_SKU_LENGTH
    ) {
      throw new CheckoutValidationError('invalid sku');
    }
    if (
      !Number.isSafeInteger(item.quantity)
      || item.quantity <= 0
      || item.quantity > MAX_QUANTITY
    ) {
      throw new CheckoutValidationError('invalid quantity');
    }
    if (
      !Number.isSafeInteger(item.unitPrice)
      || item.unitPrice < 0
      || item.unitPrice > MAX_UNIT_PRICE
    ) {
      throw new CheckoutValidationError('invalid price');
    }

    const next = sum + item.quantity * item.unitPrice;
    if (!Number.isSafeInteger(next)) {
      throw new CheckoutValidationError('total exceeds the safe integer range');
    }
    return next;
  }, 0);
}

export function createCheckout({
  capture = async () => 'pay-1',
  save = async () => undefined,
} = {}) {
  return async function checkout(command, { signal } = {}) {
    signal?.throwIfAborted();

    if (!hasExactKeys(command, COMMAND_KEYS)) {
      throw new CheckoutValidationError(
        'checkout fields must match the API schema',
      );
    }
    if (typeof command.orderId !== 'string' || command.orderId.length === 0) {
      throw new CheckoutValidationError('orderId must not be empty');
    }
    if (!isValidOrderId(command.orderId)) {
      throw new CheckoutValidationError('invalid orderId');
    }
    if (typeof command.token !== 'string' || command.token.length === 0) {
      throw new CheckoutValidationError('token must not be empty');
    }
    if (codePointLength(command.token) > MAX_TOKEN_LENGTH) {
      throw new CheckoutValidationError('invalid token');
    }

    const total = totalOf(command.items);
    const paymentId = await capture(total, command.token, { signal });
    signal?.throwIfAborted();

    const order = {
      orderId: command.orderId,
      total,
      status: 'CONFIRMED',
      paymentId,
    };
    await save(order, { signal });
    signal?.throwIfAborted();
    return order;
  };
}
