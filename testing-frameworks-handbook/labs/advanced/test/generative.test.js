import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fc from 'fast-check';
import {
  canonicalizeCart,
  discountedTotal,
  referenceTotal,
  totalOf
} from '../src/checkout.js';
import {
  PRICE_BOUNDARIES,
  PROPERTY_RUNS,
  PROPERTY_SEED,
  QUANTITY_BOUNDARIES,
  cartArbitrary,
  itemArbitrary,
  propertyParameters
} from '../src/generators.js';

const corpusUrl = new URL('../corpus/synthetic-quantity-cap.json', import.meta.url);

function legacyTotalWithQuantityCap(items) {
  return items.reduce(
    (sum, item) => sum + Math.min(item.quantity, 9) * item.unitPrice,
    0
  );
}

function assertProperty(...arguments_) {
  fc.assert(fc.property(...arguments_), propertyParameters);
}

test('invariant I-01: total is a non-negative safe integer', () => {
  assertProperty(cartArbitrary, items => {
    const total = totalOf(items);
    assert.ok(Number.isSafeInteger(total));
    assert.ok(total >= 0);
  });
});

test('invariant I-02: adding a valid line never decreases total', () => {
  assertProperty(cartArbitrary, itemArbitrary, (items, extra) => {
    assert.ok(totalOf([...items, extra]) >= totalOf(items));
  });
});

test('invariant I-03: discount is bounded by zero and the original total', () => {
  assertProperty(
    cartArbitrary,
    fc.integer({ min: 0, max: 10_000 }),
    (items, basisPoints) => {
      const original = totalOf(items);
      const discounted = discountedTotal(items, basisPoints);
      assert.ok(discounted >= 0);
      assert.ok(discounted <= original);
    }
  );
});

test('invariant I-04: larger discounts cannot increase payable total', () => {
  assertProperty(
    cartArbitrary,
    fc.integer({ min: 0, max: 10_000 }),
    fc.integer({ min: 0, max: 10_000 }),
    (items, first, second) => {
      const smallerDiscount = Math.min(first, second);
      const largerDiscount = Math.max(first, second);
      assert.ok(
        discountedTotal(items, largerDiscount)
          <= discountedTotal(items, smallerDiscount)
      );
    }
  );
});

test('invariant I-05: a zero-price line is neutral', () => {
  assertProperty(cartArbitrary, itemArbitrary, (items, item) => {
    const free = { ...item, unitPrice: 0 };
    assert.equal(totalOf([...items, free]), totalOf(items));
  });
});

test('metamorphic relations: permutation, partition, and normalization', () => {
  assertProperty(cartArbitrary, items => {
    const reversed = [...items].reverse();
    const middle = Math.floor(items.length / 2);

    assert.equal(totalOf(reversed), totalOf(items));
    assert.equal(
      totalOf(items.slice(0, middle)) + totalOf(items.slice(middle)),
      totalOf(items)
    );
    assert.deepEqual(canonicalizeCart(reversed), canonicalizeCart(items));
    assert.deepEqual(
      canonicalizeCart(canonicalizeCart(items)),
      canonicalizeCart(items)
    );
    assert.equal(totalOf(canonicalizeCart(items)), totalOf(items));
  });
});

test('differential: optimized total matches an independent repeated-addition model', () => {
  assertProperty(cartArbitrary, items => {
    assert.equal(totalOf(items), referenceTotal(items));
  });
});

test('generator review: declared edge/ordinary and cart-size distributions are exercised', () => {
  const items = fc.sample(itemArbitrary, { seed: PROPERTY_SEED, numRuns: 2_000 });
  const carts = fc.sample(cartArbitrary, { seed: PROPERTY_SEED, numRuns: 2_000 });
  const boundaryQuantities = items.filter(item =>
    QUANTITY_BOUNDARIES.includes(item.quantity)
  ).length;
  const boundaryPrices = items.filter(item =>
    PRICE_BOUNDARIES.includes(item.unitPrice)
  ).length;
  const emptyCarts = carts.filter(cart => cart.length === 0).length;
  const singleCarts = carts.filter(cart => cart.length === 1).length;
  const manyCarts = carts.filter(cart => cart.length >= 2).length;

  assert.ok(boundaryQuantities >= 700 && boundaryQuantities <= 1_100);
  assert.ok(boundaryPrices >= 700 && boundaryPrices <= 1_100);
  assert.ok(emptyCarts >= 120 && emptyCarts <= 300);
  assert.ok(singleCarts >= 280 && singleCarts <= 520);
  assert.ok(manyCarts >= 1_250 && manyCarts <= 1_550);
});

test('shrinker review: a hidden synthetic defect reduces to the committed counterexample', async () => {
  const corpus = JSON.parse(await readFile(corpusUrl, 'utf8'));
  assert.equal(fc.__version, corpus.fastCheckVersion);
  const defectItemArbitrary = fc.record({
    sku: fc.constant('A'),
    quantity: fc.integer({ min: 1, max: 1_000 }),
    unitPrice: fc.integer({ min: 1, max: 1_000_000 })
  });
  const commonExamples = [
    { sku: 'BOOK', quantity: 1, unitPrice: 800 },
    { sku: 'PEN', quantity: 2, unitPrice: 120 }
  ];
  for (const item of commonExamples) {
    assert.equal(legacyTotalWithQuantityCap([item]), totalOf([item]));
  }

  const result = fc.check(
    fc.property(defectItemArbitrary, item =>
      legacyTotalWithQuantityCap([item]) === totalOf([item])
    ),
    propertyParameters
  );

  assert.equal(result.failed, true);
  assert.ok(result.numRuns <= PROPERTY_RUNS);
  assert.equal(result.seed, corpus.seed);
  assert.equal(result.counterexamplePath, corpus.path);
  assert.equal(result.numShrinks, corpus.numShrinks);
  const [shrunkItem] = result.counterexample;
  assert.equal(shrunkItem.quantity, corpus.input.quantity);
  assert.equal(shrunkItem.unitPrice, corpus.input.unitPrice);
  assert.equal(
    legacyTotalWithQuantityCap([corpus.input]),
    corpus.legacyActual
  );
  assert.equal(totalOf([corpus.input]), corpus.expected);
});

test('regression corpus: production implementation keeps the discovered case fixed', async () => {
  const corpus = JSON.parse(await readFile(corpusUrl, 'utf8'));
  assert.equal(totalOf([corpus.input]), corpus.expected);
  assert.equal(corpus.seed, PROPERTY_SEED);
});
