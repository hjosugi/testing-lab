import fc from 'fast-check';

export const PROPERTY_SEED = 20_260_719;
export const PROPERTY_RUNS = 500;
export const QUANTITY_BOUNDARIES = Object.freeze([1, 2, 9, 10, 99, 1_000]);
export const PRICE_BOUNDARIES = Object.freeze([0, 1, 99, 100, 4_999, 5_000, 5_001, 1_000_000]);

const skuCharacters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'];
const skuArbitrary = fc
  .array(fc.constantFrom(...skuCharacters), { minLength: 1, maxLength: 8 })
  .map(characters => characters.join(''));
const fromBoundaries = values =>
  fc.integer({ min: 0, max: values.length - 1 }).map(index => values[index]);

export const quantityArbitrary = fc.oneof(
  { withCrossShrink: true },
  { weight: 4, arbitrary: fromBoundaries(QUANTITY_BOUNDARIES) },
  { weight: 6, arbitrary: fc.integer({ min: 1, max: 1_000 }) }
);

export const priceArbitrary = fc.oneof(
  { withCrossShrink: true },
  { weight: 4, arbitrary: fromBoundaries(PRICE_BOUNDARIES) },
  { weight: 6, arbitrary: fc.integer({ min: 0, max: 1_000_000 }) }
);

export const itemArbitrary = fc.record({
  sku: skuArbitrary,
  quantity: quantityArbitrary,
  unitPrice: priceArbitrary
});

export const cartArbitrary = fc.oneof(
  { withCrossShrink: true },
  { weight: 1, arbitrary: fc.constant([]) },
  { weight: 2, arbitrary: itemArbitrary.map(item => [item]) },
  { weight: 7, arbitrary: fc.array(itemArbitrary, { minLength: 2, maxLength: 20 }) }
);

export const propertyParameters = Object.freeze({
  seed: PROPERTY_SEED,
  numRuns: PROPERTY_RUNS,
  endOnFailure: false
});
