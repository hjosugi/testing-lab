// Executes the feature file as the acceptance suite and enforces the rules
// that keep Specification by Example useful: business language only, no
// duplicate scenarios, no slow steps, every rule traced to a scenario and to
// lower-level tests, and sign-offs bound to the exact examples.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expand, lintFeature, parseFeature, runScenario } from '../src/gherkin.mjs';
import { reviewStatus } from '../src/review.mjs';
import { checkoutSteps } from '../src/steps.mjs';

const featureText = readFileSync(new URL('../features/coupon.feature', import.meta.url), 'utf8');
const feature = parseFeature(featureText, 'features/coupon.feature');
const scenarios = expand(feature);
const steps = checkoutSteps();

for (const scenario of scenarios) {
  test(`[acceptance] ${scenario.tags.join(' ')} ${scenario.name}`, async () => {
    const { slow } = await runScenario(scenario, steps);
    assert.deepEqual(slow, [], 'step definitions must stay fast; slow setup belongs in lower layers');
  });
}

test('feature file: business language only, no duplicate scenarios, every scenario tagged with a rule', () => {
  assert.equal(scenarios.length, 7);
  assert.deepEqual(lintFeature(feature), []);
  const leaky = parseFeature(`Feature: Leaky
  @R1
  Rule: UI details
    Scenario: Click through
      Given the customer clicks the "Apply" button on the cart page
      Then they pay 100 yen
    Scenario: Click through again
      Given the customer clicks the "Apply" button on the cart page
      Then they pay 100 yen
    Scenario: Untraced
      Given nothing`, 'leaky.feature');
  const problems = lintFeature(leaky);
  assert.equal(problems.filter(problem => problem.includes('UI detail')).length, 2);
  assert.equal(problems.filter(problem => problem.includes('duplicate')).length, 1);
});

test('undefined and ambiguous steps fail loudly instead of passing silently', async () => {
  const undefinedStep = { name: 'x', steps: [{ keyword: 'Given', text: 'a customer who pays in bitcoin' }] };
  await assert.rejects(runScenario(undefinedStep, steps), /undefined step/);
  const duplicated = checkoutSteps();
  duplicated.define(/^they pay (\d+) yen$/, () => {});
  await assert.rejects(runScenario({ name: 'y', steps: [{ keyword: 'Then', text: 'they pay 1 yen' }] }, duplicated), /ambiguous step/);
});

test('traceability: every rule has an acceptance criterion, a scenario, and a lower-level test', () => {
  const unitTests = readFileSync(new URL('./domain.test.mjs', import.meta.url), 'utf8');
  const rules = [...new Set(feature.scenarios.flatMap(scenario => scenario.tags.filter(tag => /^@R\d+$/.test(tag))))].sort();
  assert.deepEqual(rules, ['@R1', '@R2', '@R3', '@R4', '@R5']);
  for (const rule of rules) {
    const id = rule.slice(1);
    assert.ok(feature.scenarios.some(scenario => scenario.tags.includes(rule) && scenario.tags.some(tag => tag.startsWith('@AC-'))), `${id} has an acceptance criterion tag`);
    assert.match(unitTests, new RegExp(`test\\('${id} `), `${id} has a lower-level test`);
  }
});

test('review sign-off is bound to the exact examples it approved', () => {
  const committed = JSON.parse(readFileSync(new URL('../review.json', import.meta.url), 'utf8'));
  const status = reviewStatus(committed, featureText);
  assert.deepEqual(status.missing, ['product', 'qa', 'engineer'], 'no sign-off is claimed until the three roles actually review');
  const signed = { requiredRoles: committed.requiredRoles, reviews: ['product', 'qa', 'engineer'].map(role => ({ role, reviewer: role, date: '2026-09-25', featureSha256: status.digest })) };
  assert.equal(reviewStatus(signed, featureText).agreed, true);
  const edited = reviewStatus(signed, featureText.replace('3200', '3100'));
  assert.equal(edited.agreed, false, 'changing an example invalidates the sign-off');
  assert.deepEqual(edited.stale, ['product', 'qa', 'engineer']);
});
