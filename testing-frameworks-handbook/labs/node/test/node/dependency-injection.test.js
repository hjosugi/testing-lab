import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReceiptId } from '../../src/receipt.js';

test('ESM dependency injection controls the boundary without loader hooks', () => {
  const receiptId = createReceiptId({ randomId: () => 'injected-id' });

  assert.equal(receiptId, 'receipt-injected-id');
});
