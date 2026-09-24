// Constraint-aware pairwise (2-way) generation, greedy AETG-style with a
// seeded tie-break, plus coverage measurement for any strength t.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function violates(model, testCase) {
  for (const constraint of model.constraints) {
    const applies = Object.entries(constraint.when).every(([factor, values]) => testCase[factor] === undefined || values.includes(testCase[factor]));
    const fullyBound = Object.keys(constraint.when).every(factor => testCase[factor] !== undefined);
    if (!applies || !fullyBound) continue;
    for (const [factor, values] of Object.entries(constraint.require ?? {})) {
      if (testCase[factor] !== undefined && !values.includes(testCase[factor])) return constraint.id;
    }
    for (const [factor, values] of Object.entries(constraint.forbid ?? {})) {
      if (testCase[factor] !== undefined && values.includes(testCase[factor])) return constraint.id;
    }
  }
  return null;
}

export function fullMatrix(model) {
  const factors = Object.entries(model.factors);
  let cases = [{}];
  for (const [factor, values] of factors) cases = cases.flatMap(testCase => values.map(value => ({ ...testCase, [factor]: value })));
  return { all: cases.length, valid: cases.filter(testCase => !violates(model, testCase)) };
}

function combinations(items, t) {
  if (t === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), t - 1).map(rest => [item, ...rest]));
}

// Every t-tuple of factor values that at least one valid full case contains.
export function requiredTuples(model, t = 2) {
  const { valid } = fullMatrix(model);
  const factors = Object.keys(model.factors);
  const tuples = new Set();
  for (const testCase of valid) {
    for (const combo of combinations(factors, t)) tuples.add(combo.map(factor => `${factor}=${testCase[factor]}`).join('&'));
  }
  return tuples;
}

export function coverage(model, cases, t = 2) {
  const required = requiredTuples(model, t);
  const factors = Object.keys(model.factors);
  const covered = new Set();
  for (const testCase of cases) {
    for (const combo of combinations(factors, t)) {
      const key = combo.map(factor => `${factor}=${testCase[factor]}`).join('&');
      if (required.has(key)) covered.add(key);
    }
  }
  return { required: required.size, covered: covered.size, ratio: covered.size / required.size, missing: [...required].filter(key => !covered.has(key)) };
}

export function generatePairwise(model, { seed = 1, candidates = 40 } = {}) {
  const random = mulberry32(seed);
  const { valid } = fullMatrix(model);
  const factors = Object.keys(model.factors);
  const uncovered = requiredTuples(model, 2);
  const suite = [];
  const take = testCase => {
    suite.push(testCase);
    for (const combo of combinations(factors, 2)) uncovered.delete(combo.map(factor => `${factor}=${testCase[factor]}`).join('&'));
  };
  for (const incident of model.mustInclude) {
    const broken = violates(model, incident.case);
    if (broken) throw new Error(`${incident.id} violates ${broken}; fix the incident case or the constraint`);
    take({ ...incident.case, reason: incident.id });
  }
  const gain = testCase => combinations(factors, 2).filter(combo => uncovered.has(combo.map(factor => `${factor}=${testCase[factor]}`).join('&'))).length;
  while (uncovered.size > 0) {
    let best = null;
    let bestGain = -1;
    for (let i = 0; i < candidates; i += 1) {
      const candidate = valid[Math.floor(random() * valid.length)];
      const g = gain(candidate);
      if (g > bestGain) { best = candidate; bestGain = g; }
    }
    if (bestGain <= 0) {
      // Fall back to an exhaustive scan so generation always terminates.
      best = valid.reduce((a, b) => (gain(b) > gain(a) ? b : a));
      if (gain(best) === 0) break;
    }
    take({ ...best, reason: 'pairwise' });
  }
  return suite;
}

// Pairs that no valid configuration can contain, each explained by the
// constraint that removes it.
export function excludedPairs(model) {
  const factors = Object.keys(model.factors);
  const required = requiredTuples(model, 2);
  const excluded = [];
  for (const [a, b] of combinations(factors, 2)) {
    for (const va of model.factors[a]) {
      for (const vb of model.factors[b]) {
        const key = `${a}=${va}&${b}=${vb}`;
        if (required.has(key)) continue;
        excluded.push({ pair: key, constraint: violates(model, { [a]: va, [b]: vb }) ?? explainIndirect(model, { [a]: va, [b]: vb }) });
      }
    }
  }
  return excluded;
}

function explainIndirect(model, partial) {
  // e.g. guest + invoice: invoice requires sso (C2), so guest is impossible.
  for (const constraint of model.constraints) {
    for (const [factor, values] of Object.entries(constraint.when)) {
      if (!values.includes(partial[factor])) continue;
      for (const [required, allowed] of Object.entries(constraint.require ?? {})) {
        if (partial[required] !== undefined && !allowed.includes(partial[required])) return constraint.id;
      }
    }
  }
  return 'unexplained';
}

export function buildMatrix(model, seed = 38) {
  const suite = generatePairwise(model, { seed });
  const full = fullMatrix(model);
  return {
    generatedBy: 'labs/combinatorial/scripts/generate.mjs',
    seed,
    criterion: '2-way (pairwise) coverage of every value pair that some valid configuration contains; incident cases pinned first',
    cases: suite,
    stats: {
      fullCartesian: full.all,
      validConfigurations: full.valid.length,
      pairwiseCases: suite.length,
      pairCoverage: coverage(model, suite, 2).ratio,
      tripleCoverage: Math.round(coverage(model, suite, 3).ratio * 1000) / 1000,
      ciMinutes: { pairwise: Math.round((suite.length * model.costPerCaseSeconds) / 60), fullValid: Math.round((full.valid.length * model.costPerCaseSeconds) / 60) },
    },
    excludedPairs: excludedPairs(model),
  };
}
