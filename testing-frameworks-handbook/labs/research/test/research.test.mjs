// The experiments are deterministic; the committed results.json and the
// records must match a fresh run, so a record cannot claim numbers that the
// code no longer produces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { coverageVersusMutation, generatedVersusHuman, generatorAndShrinker } from '../src/experiments.mjs';
import { kendallTau } from '../src/stats.mjs';
import { loadMutants } from '../src/mutants.mjs';
import { POOL, runTest } from '../src/pool.mjs';
import { shippingFee } from '../src/subject.mjs';

const committed = JSON.parse(readFileSync(new URL('../results.json', import.meta.url), 'utf8'));
const recordDir = new URL('../records/', import.meta.url);
const records = readdirSync(recordDir).filter(name => name.endsWith('.md')).sort().map(name => ({ name, text: readFileSync(new URL(name, recordDir), 'utf8') }));

test('harness sanity: every pool test passes on the original subject and every mutant applies', async () => {
  assert.deepEqual(POOL.filter(t => !runTest(t, shippingFee)).map(t => t.id), []);
  assert.equal((await loadMutants()).length, 16);
  assert.equal(kendallTau([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(kendallTau([1, 2, 3], [3, 2, 1]), -1);
});

test('experiments reproduce the committed results exactly', async () => {
  assert.deepEqual(await coverageVersusMutation(), committed.coverageVersusMutation);
  assert.deepEqual(generatorAndShrinker(), committed.generatorAndShrinker);
  assert.deepEqual(await generatedVersusHuman(), committed.generatedVersusHuman);
});

test('records quote the numbers the experiments produce', () => {
  const text = name => records.find(record => record.name.startsWith(name)).text;
  const cv = committed.coverageVersusMutation;
  assert.ok(text('01').includes(`raw tau(coverage, mutation score) = ${cv.rawCoverageTau}`));
  assert.ok(text('01').includes(`mean tau = ${cv.meanCoverageTauFixedSize}`));
  assert.ok(text('02').includes(`= ${cv.meanAssertionTauFixedSize}`));
  const g = committed.generatorAndShrinker;
  assert.ok(text('03').includes(`uniform ${g.uniformDetection} vs boundary-biased ${g.boundaryDetection}`));
  const h = committed.generatedVersusHuman;
  assert.ok(text('06').includes(`mutation score generated ${h.generatedMutationScore} vs human ${h.humanMutationScore}`));
});

test('every record follows the reproduction template and states its evidence status', () => {
  const headings = ['## Citation and status', '## Claim', '## Context and baseline', '## Treatment', '## Outcomes', '## Threats and differences', '## Decision'];
  assert.equal(records.length, 7);
  for (const { name, text } of records) {
    for (const heading of headings) assert.ok(text.includes(heading), `${name}: ${heading}`);
    assert.match(text, /^Result: \*\*.+\*\*$/m, `${name}: result line`);
    assert.match(text, /Peer-reviewed \/ preprint \/ industry report: .*(peer-reviewed|preprint)/, `${name}: evidence status`);
    assert.match(text, /External validity|Threats and differences\n\n- /, `${name}: threats discussed`);
  }
});

test('positive and negative results are both kept, and preprints are labelled as such', () => {
  const results = records.map(record => record.text.match(/^Result: \*\*(.+)\*\*$/m)[1]);
  assert.ok(results.some(result => result.startsWith('reproduced')), 'at least one positive result');
  assert.ok(results.some(result => result.startsWith('not reproduced')), 'at least one negative result is kept');
  const preprint = records.find(record => record.text.includes('arxiv.org'));
  assert.match(preprint.text, /preprint/);
});
