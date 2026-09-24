// Model-based testing of the order lifecycle with fast-check commands.
// The model is a plain object; every command states its precondition
// (check), applies itself to both model and system, and asserts the
// postcondition. Invalid commands are generated too: they must be rejected
// without changing state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { OrderLifecycle } from '../src/order-lifecycle.js';
import { AMOUNT, lifecycleProperty, runSequence } from './order-model.js';

test('model-based: random valid and invalid command sequences agree with the model', () => {
  fc.assert(lifecycleProperty(null), { seed: 20260925, numRuns: 500 });
});

// Handwritten examples that look thorough: one partial refund, one full
// refund, cancel after pay, duplicate pay, retries, and rejections.
function exampleSuite(defect) {
  const paid = () => { const order = new OrderLifecycle({ amount: AMOUNT, defect }); order.reserve(); order.pay('k1'); return order; };
  const partial = paid(); partial.refund(300); assert.equal(partial.refunded, 300);
  const full = paid(); full.refund(AMOUNT); assert.equal(full.refunded, AMOUNT);
  assert.throws(() => paid().refund(AMOUNT + 1));
  const cancelled = paid(); cancelled.cancel(); assert.equal(cancelled.refunded, AMOUNT);
  const duplicate = paid(); assert.equal(duplicate.pay('k1'), 'rcpt-1'); assert.equal(duplicate.paid, AMOUNT);
  assert.throws(() => new OrderLifecycle({ amount: AMOUNT, defect }).pay('k1'));
  const shipped = paid(); shipped.ship(); assert.throws(() => shipped.cancel());
}

test('examples pass on the correct implementation and also miss the seeded refund defect', () => {
  exampleSuite(null);
  assert.doesNotThrow(() => exampleSuite('refund-per-call-cap'), 'the handwritten examples do not kill the mutant');
});

test('model-based testing kills the defect, shrinks it to a minimal sequence, and replays it from the saved seed', () => {
  const details = fc.check(lifecycleProperty('refund-per-call-cap'), { seed: 20260925, numRuns: 500 });
  assert.equal(details.failed, true, 'model-based run kills the mutant');
  const minimal = [...details.counterexample[0].commands].map(String);
  const corpus = JSON.parse(readFileSync(new URL('../corpus/order-lifecycle-refund-cap.json', import.meta.url), 'utf8'));
  assert.equal(details.seed, corpus.seed);
  assert.equal(details.counterexamplePath, corpus.path, 'same seed, same failing path');
  assert.deepEqual(minimal, corpus.minimalCommands);
  // The saved minimal sequence is a plain regression test: red on the
  // defect, green on the fix, independent of the generator.
  assert.throws(() => runSequence(corpus.minimalCommands, 'refund-per-call-cap'), /Missing expected exception/, 'the over-refund was accepted instead of rejected');
  assert.doesNotThrow(() => runSequence(corpus.minimalCommands, null));
  // Re-running with the saved seed reproduces the identical failure.
  const again = fc.check(lifecycleProperty('refund-per-call-cap'), { seed: corpus.seed, numRuns: 500 });
  assert.equal(again.counterexamplePath, corpus.path);
});
