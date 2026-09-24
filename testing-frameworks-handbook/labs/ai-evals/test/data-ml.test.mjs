import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRevenue, checkSchema, checkUnique, reconcile } from '../src/data.mjs';
import { equalOpportunityGap, evaluate, flipRate, psi, sliceGate, sliceMetrics, synthesize, train } from '../src/model.mjs';
import { mulberry32 } from '../src/random.mjs';

const SCHEMA = {
  orderId: { type: 'string' },
  total: { type: 'integer', min: 0, max: 10_000_000 },
  currency: { type: 'string', enum: ['JPY', 'USD'] },
  coupon: { type: 'string', nullable: true },
};

test('data quality: schema, null, range, enum, uniqueness, and reconciliation failures are all reported', () => {
  const orders = [
    { orderId: 'o1', total: 1200, currency: 'JPY', coupon: null },
    { orderId: 'o2', total: -5, currency: 'EUR', coupon: 'X' },
    { orderId: null, total: 1.5, currency: 'JPY' },
    { orderId: 'o1', total: 300, currency: 'USD', coupon: null },
  ];
  assert.deepEqual(checkSchema(orders, SCHEMA).map(f => `${f.index}:${f.field}:${f.check}`),
    ['1:total:range', '1:currency:enum', '2:orderId:not-null', '2:total:type']);
  assert.deepEqual(checkUnique(orders, 'orderId'), [{ key: 'o1', first: 0, again: 3 }]);
  const lines = [
    { lineId: 'l1', orderId: 'o1', quantity: 2, unitPrice: 600 },
    { lineId: 'l2', orderId: 'o9', quantity: 1, unitPrice: 100 },
  ];
  assert.deepEqual(reconcile([{ orderId: 'o1', total: 1200 }, { orderId: 'o3', total: 50 }], lines), { mismatched: ['o3'], orphans: ['l2'] });
});

test('streaming: duplicates and bounded out-of-order delivery give the same revenue; truly late events are side-output', () => {
  const random = mulberry32(9);
  const ordered = Array.from({ length: 60 }, (_, i) => ({ eventId: `e${i}`, eventTime: i * 5_000, amount: 100 + i }));
  const baseline = aggregateRevenue(ordered);
  // Bounded disorder: swap neighbours (<= 5 s apart), then redeliver 10 events.
  const disordered = [...ordered];
  for (let i = 0; i + 1 < disordered.length; i += 2) if (random() < 0.5) [disordered[i], disordered[i + 1]] = [disordered[i + 1], disordered[i]];
  const redelivered = [...disordered, ...Array.from({ length: 10 }, () => ordered[Math.floor(random() * ordered.length)])];
  assert.deepEqual(aggregateRevenue(redelivered), baseline, 'idempotent under duplicates and bounded reordering');
  assert.deepEqual(baseline.late, []);
  const withLate = aggregateRevenue([...ordered, { eventId: 'late-1', eventTime: 1_000, amount: 999_999 }]);
  assert.deepEqual(withLate.late, ['late-1']);
  assert.deepEqual(withLate.revenue, baseline.revenue, 'a closed window is never silently rewritten');
});

const model = train(synthesize({ seed: 1 }), { seed: 1 });
const holdout = synthesize({ seed: 101 });
const THRESHOLDS = { aggregateRecall: 0.6, criticalSliceRecall: { br: 0.5, jp: 0.5 } };

test('ML slices: the aggregate passes while the critical minority slice fails, so the gate fails', () => {
  const aggregate = evaluate(model, holdout);
  const slices = sliceMetrics(model, holdout, 'region');
  assert.ok(aggregate.accuracy > 0.95 && aggregate.recall >= THRESHOLDS.aggregateRecall, JSON.stringify(aggregate));
  const verdict = sliceGate({ aggregate, slices, thresholds: THRESHOLDS });
  assert.equal(verdict.passed, false);
  assert.deepEqual(verdict.failures.map(failure => failure.split(' recall')[0]), ['slice br']);
  assert.ok(equalOpportunityGap(slices) > 0.5, 'fairness: recall gap between regions is reported, not averaged away');
});

test('ML robustness and drift: tiny perturbations do not flip confident decisions; a shifted population is detected by PSI', () => {
  assert.ok(flipRate(model, holdout) < 0.01);
  const trainingAmounts = synthesize({ seed: 1 }).map(row => row.x[0]);
  assert.ok(psi(trainingAmounts, holdout.map(row => row.x[0])) < 0.1, 'same population: stable');
  assert.ok(psi(trainingAmounts, synthesize({ seed: 102, amountShift: 1 }).map(row => row.x[0])) > 0.25, 'shifted population: drift');
});

test('nondeterminism: metrics are gated on the worst of 5 training/data seeds, not on one lucky run', () => {
  const recalls = [1, 2, 3, 4, 5].map(seed => evaluate(train(synthesize({ seed }), { seed }), synthesize({ seed: 200 + seed })).recall);
  const spread = Math.max(...recalls) - Math.min(...recalls);
  assert.ok(Math.min(...recalls) >= 0.6, `worst-seed recall ${Math.min(...recalls).toFixed(3)}`);
  assert.ok(spread > 0, 'seeds genuinely vary, so a single run would overstate confidence');
  assert.deepEqual(train(synthesize({ seed: 1 }), { seed: 1 }), model, 'same seed, same model');
});
