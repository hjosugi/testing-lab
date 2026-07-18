import assert from 'node:assert/strict';
import { test } from 'node:test';

test('ESM module mock replaces an import before the subject is loaded', async t => {
  t.mock.module('node:crypto', {
    exports: {
      randomUUID: () => 'module-mocked-id'
    }
  });

  const { createReceiptId } = await import('../../src/receipt.js?module-mocked');

  assert.equal(createReceiptId(), 'receipt-module-mocked-id');
});
