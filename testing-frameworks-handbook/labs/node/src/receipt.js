import { randomUUID } from 'node:crypto';

export function createReceiptId({ randomId = randomUUID } = {}) {
  return `receipt-${randomId()}`;
}
