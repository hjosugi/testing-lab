// Small, seeded reproductions of published testing claims. Each function
// returns numbers that records/*.md cite; the tests re-run them and require
// the same numbers, so a record can never drift from its evidence.
import { loadMutants } from './mutants.mjs';
import { POOL, runTest } from './pool.mjs';
import { PROBES, shippingFee } from './subject.mjs';
import { kendallTau, mean, mulberry32, round } from './stats.mjs';

function sample(random, items, size) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

// Claims 1 and 2: coverage vs mutation score, raw and with suite size fixed;
// assertion count vs mutation score with suite size fixed.
export async function coverageVersusMutation({ seed = 2014, suitesPerSize = 40, sizes = [3, 5, 8, 12] } = {}) {
  const mutants = await loadMutants();
  const killMatrix = POOL.map(test => mutants.map(mutant => !runTest(test, mutant.shippingFee)));
  const probeSets = POOL.map(test => {
    const hits = new Set();
    runTest(test, shippingFee, probe => hits.add(probe));
    return hits;
  });
  const random = mulberry32(seed);
  const suites = [];
  for (const size of sizes) {
    for (let k = 0; k < suitesPerSize; k += 1) {
      const indexes = sample(random, POOL.map((_, i) => i), size);
      const covered = new Set(indexes.flatMap(i => [...probeSets[i]]));
      const killed = mutants.filter((_, m) => indexes.some(i => killMatrix[i][m])).length;
      suites.push({ size, coverage: covered.size / PROBES.length, mutationScore: killed / mutants.length, assertions: indexes.reduce((sum, i) => sum + POOL[i].assertions, 0) });
    }
  }
  const tau = (rows, x, y) => kendallTau(rows.map(row => row[x]), rows.map(row => row[y]));
  const bySize = sizes.map(size => {
    const rows = suites.filter(suite => suite.size === size);
    return { size, coverageTau: round(tau(rows, 'coverage', 'mutationScore')), assertionTau: round(tau(rows, 'assertions', 'mutationScore')) };
  });
  return {
    mutants: mutants.length,
    pool: POOL.length,
    suites: suites.length,
    rawCoverageTau: round(tau(suites, 'coverage', 'mutationScore')),
    rawSizeTau: round(tau(suites, 'size', 'mutationScore')),
    meanCoverageTauFixedSize: round(mean(bySize.map(row => row.coverageTau))),
    meanAssertionTauFixedSize: round(mean(bySize.map(row => row.assertionTau))),
    bySize,
  };
}

// Claim 3: with an equal budget, a boundary-biased generator finds a boundary
// defect more often than a uniform one, and shrinking minimizes the input.
export function generatorAndShrinker({ seeds = 200, budget = 100 } = {}) {
  // Defect: the cap check is off by one at exactly quantity 100.
  const buggyCap = quantity => quantity > 100 || quantity === 100;
  const correct = quantity => quantity > 100;
  const fails = quantity => buggyCap(quantity) !== correct(quantity);
  const uniform = random => 1 + Math.floor(random() * 1_000);
  const boundary = random => (random() < 0.3 ? [0, 1, 99, 100, 101, 999][Math.floor(random() * 6)] : uniform(random));
  const detection = generate => {
    let found = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const random = mulberry32(seed);
      for (let run = 0; run < budget; run += 1) if (fails(generate(random))) { found += 1; break; }
    }
    return found / seeds;
  };
  // Shrinking demo on a defect with a *range* of failing inputs.
  const rangeFails = quantity => quantity >= 37;
  const shrink = value => {
    let current = value;
    for (let candidate = Math.floor(current / 2); candidate < current; ) {
      if (rangeFails(candidate)) { current = candidate; candidate = Math.floor(current / 2); } else candidate += Math.max(1, Math.floor((current - candidate) / 2));
    }
    return current;
  };
  const random = mulberry32(7);
  let first;
  do { first = uniform(random); } while (!rangeFails(first));
  return { seeds, budget, uniformDetection: round(detection(uniform)), boundaryDetection: round(detection(boundary)), firstCounterexample: first, shrunkCounterexample: shrink(first) };
}

// Claim 4 stand-in for LLM/automatic generation: regression-oracle tests
// generated from the *current* implementation vs human specification tests,
// on the same subject with a seeded real defect.
export async function generatedVersusHuman({ seed = 2024, generated = 24 } = {}) {
  const random = mulberry32(seed);
  const regions = ['main', 'remote'];
  // Seeded real defect in the "current" code: members get free shipping from
  // 4000 instead of the specified 5000.
  const defective = await import(`data:text/javascript;base64,${Buffer.from((await import('./mutants.mjs')).SUBJECT_SOURCE.replace('subtotal >= 5000', 'subtotal >= 4000')).toString('base64')}`);
  const generatedTests = Array.from({ length: generated }, (_, i) => {
    const input = { subtotal: Math.floor(random() * 12_000), weightKg: 1 + Math.floor(random() * 20), express: random() < 0.5, member: random() < 0.5, region: regions[Math.floor(random() * 2)] };
    const observed = defective.shippingFee(input);
    return { id: `gen-${i + 1}`, input, assertions: 1, checks: [fee => fee === observed] };
  });
  const mutants = await loadMutants();
  const score = tests => mutants.filter(mutant => tests.some(test => !runTest(test, mutant.shippingFee))).length / mutants.length;
  const detectsDefect = tests => tests.some(test => !runTest(test, defective.shippingFee));
  const typeOnly = POOL.filter(test => test.checks.length === 1 && test.checks[0].toString().includes('typeof')).length;
  const duplicates = generatedTests.length - new Set(generatedTests.map(test => JSON.stringify(test.input))).size;
  return {
    humanTests: POOL.length,
    generatedTests: generatedTests.length,
    humanMutationScore: round(score(POOL)),
    generatedMutationScore: round(score(generatedTests)),
    humanDetectsSeededDefect: detectsDefect(POOL),
    generatedDetectsSeededDefect: detectsDefect(generatedTests),
    humanTypeOnlyAssertions: typeOnly,
    generatedDuplicateInputs: duplicates,
    generatedMagicNumberOracles: generatedTests.length,
  };
}
