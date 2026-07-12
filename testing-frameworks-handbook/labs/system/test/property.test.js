import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { totalOf } from '../src/app.js';

test('adding a valid item never decreases the total', () => {
  fc.assert(fc.property(
    fc.array(fc.record({
      sku: fc.string({ minLength: 1 }),
      quantity: fc.integer({ min: 1, max: 100 }),
      unitPrice: fc.integer({ min: 0, max: 1_000_000 })
    }), { minLength: 1, maxLength: 30 }),
    fc.record({ sku: fc.string({ minLength: 1 }), quantity: fc.integer({ min: 1, max: 100 }), unitPrice: fc.integer({ min: 0, max: 1_000_000 }) }),
    (items, extra) => assert.ok(totalOf([...items, extra]) >= totalOf(items))
  ));
});

