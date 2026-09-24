#!/usr/bin/env node
// Microbenchmark suite: in-process CPU cost of the quote calculation only.
// It never touches the network and never feeds the SLO; it answers "did this
// function get slower on this machine?" with warm-up, repeated samples, and a
// correctness oracle so dead-code elimination cannot fake a fast result.
import assert from 'node:assert/strict';

const quote = items => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
const cart = Array.from({ length: 50 }, (_, index) => ({ sku: `SKU-${index}`, quantity: (index % 5) + 1, unitPrice: 100 + index }));
const expected = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

function sample(iterations) {
  let checksum = 0;
  const started = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) checksum += quote(cart);
  const elapsedNs = Number(process.hrtime.bigint() - started);
  assert.equal(checksum, expected * iterations, 'benchmark result must stay correct');
  return elapsedNs / iterations;
}

const warmupSamples = 5;
const measuredSamples = 15;
const iterations = 20_000;
for (let i = 0; i < warmupSamples; i += 1) sample(iterations);
const nsPerOp = Array.from({ length: measuredSamples }, () => sample(iterations)).sort((a, b) => a - b);
const median = nsPerOp[Math.floor(nsPerOp.length / 2)];
const mad = [...nsPerOp.map(value => Math.abs(value - median))].sort((a, b) => a - b)[Math.floor(nsPerOp.length / 2)];
const result = {
  kind: 'microbenchmark',
  subject: 'quote(50-line cart)',
  warmupSamples,
  measuredSamples,
  iterationsPerSample: iterations,
  nsPerOp: { median: Math.round(median), mad: Math.round(mad), min: Math.round(nsPerOp[0]), max: Math.round(nsPerOp.at(-1)) },
};
console.log(JSON.stringify(result));
