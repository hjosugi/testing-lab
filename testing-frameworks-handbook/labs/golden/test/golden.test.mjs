import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approvalProblems, auditConfig, diff, fromPpm, renderCheckout, sha256, toPpm } from '../src/golden.mjs';
import { renderReceipt } from '../../advanced/src/checkout.js';

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const approvals = JSON.parse(readFileSync(new URL('../approvals.json', import.meta.url), 'utf8'));
const baseline = name => readFileSync(new URL(`../baselines/${name}`, import.meta.url));
const STATE = { total: 1560, itemCount: 2, timestamp: config.clock };

test('determinism: fixed viewport, clock, no animation or fonts give a byte-identical render', () => {
  assert.equal(sha256(toPpm(renderCheckout(STATE))), sha256(baseline('checkout-2-items.ppm')));
  assert.deepEqual(fromPpm(baseline('checkout-2-items.ppm')).pixels, renderCheckout(STATE).pixels);
});

test('masks and threshold: volatile timestamp is ignored, a price change is not', () => {
  const golden = fromPpm(baseline('checkout-2-items.ppm'));
  const later = diff(golden, renderCheckout({ ...STATE, timestamp: '2026-09-25T09:41:07.123Z' }), { masks: config.masks });
  assert.equal(later.changedPixels, 0, 'masked timestamp');
  const priceChange = diff(golden, renderCheckout({ ...STATE, total: 156_000 }), { masks: config.masks });
  assert.ok(priceChange.ratio > config.threshold, `price change is ${(priceChange.ratio * 100).toFixed(2)}% of pixels`);
  assert.deepEqual(priceChange.box, { x0: 20, y0: 26, x1: 27, y1: 28 }, 'the failure artifact points at the total');
  assert.equal(diff(golden, { ...golden, width: 65 }).comparable, false, 'viewport drift is reported, not diffed');
});

test('mask and threshold audit: masks need reasons and may not hide the page', () => {
  assert.deepEqual(auditConfig(config), []);
  assert.deepEqual(auditConfig({ threshold: 0.05, masks: [{ x: 0, y: 0, w: 64, h: 40 }] }), [
    'masks hide 100.0% of the viewport',
    'mask at 0,0 has no reason',
    'threshold 0.05 exceeds 0.002',
  ]);
});

test('semantic assertion replaces the text snapshot where meaning is known', () => {
  const receipt = renderReceipt('o-1', [{ sku: 'book', quantity: 2, unitPrice: 600 }, { sku: 'pen', quantity: 3, unitPrice: 120 }]);
  const lines = receipt.split('\n');
  assert.equal(lines.at(-1), 'TOTAL 1560');
  assert.deepEqual(lines.slice(1, -1).map(line => Number(line.split(' = ')[1])).reduce((a, b) => a + b, 0), 1560, 'lines add up to the total');
  // The golden file still guards layout/format, which has no simpler oracle.
  assert.equal(`${receipt}\n`, baseline('receipt.golden.txt').toString());
});

test('approval: bulk updates, self-approval, and vague reasons are rejected; unapproved baselines are reported', () => {
  const baselines = ['checkout-2-items.ppm', 'receipt.golden.txt'].map(name => ({ name, content: baseline(name) }));
  // Committed state: baselines were created with the lab and await a human.
  assert.deepEqual(approvalProblems(baselines, approvals.approvals).map(problem => problem.split(':')[0]), ['checkout-2-items.ppm', 'receipt.golden.txt']);
  assert.deepEqual(approvals.pending.map(entry => entry.baseline), ['checkout-2-items.ppm', 'receipt.golden.txt']);

  const good = baselines.map(({ name, content }, i) => ({ baseline: name, sha256: sha256(content), author: 'dev-a', reviewer: 'dev-b', reason: i === 0 ? 'Two-line cart layout after moving the total above the button' : 'Receipt adds pen line; totals re-checked by hand' }));
  assert.deepEqual(approvalProblems(baselines, good), []);
  const bulk = good.map(entry => ({ ...entry, reason: 'update snapshots after refactor' }));
  assert.match(approvalProblems(baselines, bulk).at(-1), /bulk update: 2 baselines share the reason/);
  assert.match(approvalProblems(baselines, [{ ...good[0], reviewer: 'dev-a' }, good[1]])[0], /cannot approve their own/);
  const changed = [{ name: 'receipt.golden.txt', content: Buffer.from('TOTAL 0\n') }];
  assert.match(approvalProblems(changed, good)[0], /has no approval/, 'a changed baseline needs a new approval for its new hash');
});
