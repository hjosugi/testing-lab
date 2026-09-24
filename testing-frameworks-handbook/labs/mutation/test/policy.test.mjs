import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fullPlan, gateSurvivors, planLanes, reviewActionRate, strykerSurvivors, validateLedger,
} from '../src/policy.mjs';
import { recoverInterrupted, validateCatalog, withMutant } from '../src/targeted.mjs';
import { pitMutants } from '../scripts/gate-pit.mjs';
import { handbookRoot, labRoot, loadLedger, loadRiskMap, readJson } from '../src/load.mjs';

const riskMap = loadRiskMap();
const TODAY = '2026-09-25';

test('risk map: every lane is referenced and every module lane exists', () => {
  const laneIds = riskMap.lanes.map(lane => lane.id);
  assert.equal(new Set(laneIds).size, laneIds.length);
  const referenced = new Set(riskMap.modules.flatMap(module => module.lanes));
  assert.deepEqual([...referenced].sort(), [...laneIds].sort(), 'no orphan lanes, no dangling references');
  for (const module of riskMap.modules) assert.ok(['high', 'medium', 'low'].includes(module.risk), module.id);
});

test('changed-file lane: high risk first, budget overflow is deferred with a reason', () => {
  const plan = planLanes({
    changedFiles: [
      'testing-frameworks-handbook/labs/dotnet/src/Checkout/Domain.cs',
      'labs/java/src/main/java/handbook/checkout/CartItem.java',
      'labs/go/item_line.go',
    ],
    riskMap,
    budgetSeconds: 400,
  });
  assert.deepEqual(plan.selected.map(entry => [entry.id, entry.risk]), [['java-pit', 'high'], ['go-targeted', 'medium']],
    'a cheaper medium-risk lane still fits after a high-risk lane is deferred');
  assert.deepEqual(plan.deferred.map(entry => [entry.id, entry.deferral]), [
    ['dotnet-targeted', 'budget: 150+300s exceeds 400s'],
  ]);
  assert.equal(plan.estimatedSeconds, 195);
});

test('changed-file lane: a lane keeps the highest risk of the files that selected it', () => {
  const plan = planLanes({ changedFiles: ['labs/go/item_line.go', 'labs/go/checkout.go'], riskMap, budgetSeconds: 600 });
  assert.equal(plan.selected.length, 1);
  assert.equal(plan.selected[0].risk, 'high');
  assert.equal(plan.selected[0].reasons.length, 2);
});

test('changed-file lane: low-risk-only changes run nowhere in the PR and docs are ignored', () => {
  const plan = planLanes({ changedFiles: ['labs/advanced/src/generators.js', 'docs/07-advanced-testing.md', 'labs/go/README.md'], riskMap });
  assert.deepEqual(plan.selected, []);
  assert.equal(plan.deferred[0].deferral, 'low-risk: scheduled full lane only');
  assert.deepEqual(plan.unmapped, []);
});

test('changed-file lane: production code without a mutation lane is surfaced, not skipped silently', () => {
  const plan = planLanes({ changedFiles: ['labs/system/src/order-store.js'], riskMap });
  assert.deepEqual(plan.unmapped, ['labs/system/src/order-store.js']);
});

test('scheduled full lane runs every lane regardless of budget', () => {
  const plan = fullPlan(riskMap);
  assert.equal(plan.selected.length, riskMap.lanes.length);
  assert.ok(plan.estimatedSeconds > riskMap.prBudgetSeconds, 'full lane is intentionally larger than the PR budget');
});

test('PR budget: every high-risk lane alone fits the PR budget', () => {
  for (const lane of riskMap.lanes) assert.ok(lane.estimatedSeconds <= riskMap.prBudgetSeconds, lane.id);
});

test('ledger: committed decisions and reviews are valid today', () => {
  assert.deepEqual(validateLedger(loadLedger(), riskMap, TODAY), []);
});

test('ledger: expired, owner-less, and long-lived accepted risks are rejected', () => {
  const base = {
    id: 'D-X', lane: 'js-stryker', file: 'src/checkout.js', classification: 'accepted-risk',
    match: { mutator: 'M', original: 'a', replacement: 'b' }, rationale: 'r', owner: 'o', reviewBy: '2026-10-01', evidence: 'e',
  };
  assert.deepEqual(validateLedger({ decisions: [base], reviews: [] }, riskMap, TODAY), []);
  const errors = validateLedger({
    decisions: [
      { ...base, id: 'D-EXPIRED', reviewBy: '2026-09-24' },
      { ...base, id: 'D-OWNER', owner: ' ' },
      { ...base, id: 'D-LONG', reviewBy: '2027-06-01' },
      { ...base, id: 'D-CLASS', classification: 'ignored' },
    ],
    reviews: [{ id: 'R-1', source: 'js-stryker', mutant: 'm', outcome: 'shrug', reviewedAt: TODAY, evidence: 'e' }],
  }, riskMap, TODAY);
  assert.ok(errors.some(error => error.startsWith('decision D-EXPIRED: expired')));
  assert.ok(errors.some(error => error === 'decision D-OWNER: owner is required'));
  assert.ok(errors.some(error => error.startsWith('decision D-LONG: accepted-risk')));
  assert.ok(errors.some(error => error.startsWith('decision D-CLASS: classification')));
  assert.ok(errors.some(error => error.startsWith('review R-1: outcome')));
});

test('review action rate: measures actions, not mutation score', () => {
  const rate = reviewActionRate([
    { source: 'a', outcome: 'test-added' },
    { source: 'a', outcome: 'equivalent' },
    { source: 'b', outcome: 'code-fixed' },
    { source: 'b', outcome: 'low-value' },
  ]);
  assert.equal(rate.rate, 0.5);
  assert.deepEqual(rate.bySource.a, { reviewed: 2, actioned: 1, rate: 0.5 });
  assert.equal(reviewActionRate([]).rate, null);
});

const strykerReport = {
  files: {
    'src/checkout.js': {
      source: 'const a = x < 0;\nconst b = y;\n',
      mutants: [
        { status: 'Killed', mutatorName: 'EqualityOperator', replacement: 'x <= 0', location: { start: { line: 1, column: 11 }, end: { line: 1, column: 16 } } },
        { status: 'Survived', mutatorName: 'EqualityOperator', replacement: 'x > 0', location: { start: { line: 1, column: 11 }, end: { line: 1, column: 16 } } },
        { status: 'NoCoverage', mutatorName: 'BooleanLiteral', replacement: 'true', location: { start: { line: 2, column: 11 }, end: { line: 2, column: 12 } } },
        { status: 'Timeout', mutatorName: 'BlockStatement', replacement: '{}', location: { start: { line: 2, column: 1 }, end: { line: 2, column: 13 } } },
      ],
    },
  },
};

test('stryker gate: survivors and no-coverage need a matching decision; stale decisions fail', () => {
  const extracted = strykerSurvivors(strykerReport);
  assert.equal(extracted.total, 4);
  assert.equal(extracted.detected, 2, 'timeouts count as detected');
  assert.deepEqual(extracted.survivors.map(survivor => survivor.original), ['x < 0', 'y']);

  const decision = {
    id: 'D-1', lane: 'js-stryker', file: 'src/checkout.js',
    match: { mutator: 'EqualityOperator', original: 'x < 0', replacement: 'x > 0' },
  };
  const partial = gateSurvivors({ survivors: extracted.survivors, decisions: [decision], lane: 'js-stryker' });
  assert.equal(partial.passed, false);
  assert.deepEqual(partial.undecided.map(survivor => survivor.mutator), ['BooleanLiteral']);

  const stale = gateSurvivors({ survivors: [], decisions: [decision], lane: 'js-stryker' });
  assert.deepEqual(stale.stale, ['D-1']);
  assert.equal(stale.passed, false);
});

test('pit gate: parses PIT XML statuses', () => {
  const xml = `<?xml version="1.0"?><mutations>
<mutation detected='true' status='KILLED' numberOfTestsRun='3'><sourceFile>CartItem.java</sourceFile><mutatedClass>handbook.checkout.CartItem</mutatedClass><mutatedMethod>subtotal</mutatedMethod><lineNumber>5</lineNumber><mutator>org.pitest.mutationtest.engine.gregor.mutators.NegateConditionalsMutator</mutator><description>negated conditional</description></mutation>
<mutation detected='false' status='SURVIVED' numberOfTestsRun='3'><sourceFile>CartItem.java</sourceFile><mutatedClass>handbook.checkout.CartItem</mutatedClass><mutatedMethod>subtotal</mutatedMethod><lineNumber>5</lineNumber><mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator><description>changed conditional boundary</description></mutation>
</mutations>`;
  const mutants = pitMutants(xml);
  assert.deepEqual(mutants.map(mutant => [mutant.status, mutant.mutator, mutant.line]), [
    ['KILLED', 'NegateConditionalsMutator', 5],
    ['SURVIVED', 'ConditionalsBoundaryMutator', 5],
  ]);
  assert.equal(mutants[1].file, 'handbook.checkout.CartItem#subtotal');
});

test('targeted catalogs: every mutant still applies to exactly one location in production code', () => {
  const catalogs = readdirSync(join(labRoot, 'catalog')).filter(name => name.endsWith('.json'));
  assert.deepEqual(catalogs.sort(), ['cpp.json', 'dotnet.json', 'go.json']);
  for (const name of catalogs) {
    const catalog = readJson(join(labRoot, 'catalog', name));
    assert.deepEqual(validateCatalog(catalog, handbookRoot), [], name);
    assert.ok(riskMap.lanes.some(lane => lane.id === catalog.lane), `${name} lane is in the risk map`);
  }
});

test('targeted runner: source is restored even when the test command throws', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-lab-'));
  try {
    const file = join(dir, 'code.go');
    writeFileSync(file, 'if a <= 0 {}\n');
    const mutant = { id: 'T-1', original: 'a <= 0', replacement: 'a < 0' };
    assert.throws(() => withMutant(file, mutant, () => {
      assert.equal(readFileSync(file, 'utf8'), 'if a < 0 {}\n');
      throw new Error('runner crashed');
    }), /runner crashed/);
    assert.equal(readFileSync(file, 'utf8'), 'if a <= 0 {}\n');
    assert.equal(existsSync(`${file}.mutation-backup`), false);

    writeFileSync(`${file}.mutation-backup`, 'if a <= 0 {}\n');
    writeFileSync(file, 'if a < 0 {}\n');
    assert.equal(recoverInterrupted(file), true, 'a killed process leaves a backup that the next run restores');
    assert.equal(readFileSync(file, 'utf8'), 'if a <= 0 {}\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
