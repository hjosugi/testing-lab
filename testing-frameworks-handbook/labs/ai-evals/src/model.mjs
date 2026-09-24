// A small fraud classifier (logistic regression, pure JS) trained on seeded
// synthetic data, so slice, robustness, drift, fairness, and seed-variance
// gates can be demonstrated without external models.
import { mulberry32 } from './random.mjs';

const gaussian = random => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

// Features: amount (scaled), new account, foreign card. `biasedRegion`
// under-represents fraud patterns for one region so that the aggregate metric
// looks fine while a critical slice fails.
export function synthesize({ seed, count = 2_000, regionShare = { jp: 0.8, br: 0.2 }, fraudRate = 0.1, amountShift = 0 }) {
  const random = mulberry32(seed);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const region = random() < regionShare.jp ? 'jp' : 'br';
    const fraud = random() < fraudRate;
    // In the minority region fraud looks different (small amounts, old
    // accounts), which a model fitted mostly on jp will miss.
    const amount = fraud
      ? (region === 'jp' ? 3 + gaussian(random) * 0.7 : 1 + gaussian(random) * 0.5)
      : 1 + gaussian(random) * 0.6;
    const newAccount = fraud ? (region === 'jp' ? random() < 0.8 : random() < 0.2) : random() < 0.2;
    const foreignCard = fraud ? random() < 0.7 : random() < 0.1;
    const x = [amount + amountShift, newAccount ? 1 : 0, foreignCard ? 1 : 0];
    rows.push({ id: `tx-${seed}-${i}`, region, device: random() < 0.5 ? 'mobile' : 'web', x, y: fraud ? 1 : 0 });
  }
  return rows;
}

export function train(rows, { seed, epochs = 800, learningRate = 1.5 }) {
  const random = mulberry32(seed);
  const width = rows[0].x.length;
  const weights = Array.from({ length: width }, () => (random() - 0.5) * 0.1);
  let bias = 0;
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradient = new Array(width).fill(0);
    let gradientBias = 0;
    for (const row of rows) {
      const error = predictProbability({ weights, bias }, row.x) - row.y;
      for (let j = 0; j < width; j += 1) gradient[j] += error * row.x[j];
      gradientBias += error;
    }
    for (let j = 0; j < width; j += 1) weights[j] -= (learningRate * gradient[j]) / rows.length;
    bias -= (learningRate * gradientBias) / rows.length;
  }
  return { weights, bias, trainedOn: rows.length, seed };
}

export function predictProbability(model, x) {
  const z = model.bias + model.weights.reduce((sum, weight, j) => sum + weight * x[j], 0);
  return 1 / (1 + Math.exp(-z));
}

export function evaluate(model, rows, threshold = 0.5) {
  let tp = 0; let fp = 0; let tn = 0; let fn = 0;
  for (const row of rows) {
    const predicted = predictProbability(model, row.x) >= threshold ? 1 : 0;
    if (predicted && row.y) tp += 1; else if (predicted) fp += 1; else if (row.y) fn += 1; else tn += 1;
  }
  const safe = (a, b) => (b === 0 ? null : a / b);
  return { n: rows.length, accuracy: safe(tp + tn, rows.length), recall: safe(tp, tp + fn), precision: safe(tp, tp + fp), positiveRate: safe(tp + fp, rows.length) };
}

export function sliceMetrics(model, rows, key) {
  const slices = new Map();
  for (const row of rows) slices.set(row[key], [...(slices.get(row[key]) ?? []), row]);
  return Object.fromEntries([...slices.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([value, sliceRows]) => [value, evaluate(model, sliceRows)]));
}

// Gate: aggregate AND every critical slice must meet its own threshold.
export function sliceGate({ aggregate, slices, thresholds }) {
  const failures = [];
  if (aggregate.recall < thresholds.aggregateRecall) failures.push(`aggregate recall ${aggregate.recall.toFixed(3)} < ${thresholds.aggregateRecall}`);
  for (const [slice, minimum] of Object.entries(thresholds.criticalSliceRecall)) {
    const recall = slices[slice]?.recall;
    if (recall === null || recall === undefined || recall < minimum) failures.push(`slice ${slice} recall ${recall?.toFixed(3)} < ${minimum}`);
  }
  return { passed: failures.length === 0, failures };
}

// Population stability index between two samples of one feature.
export function psi(expected, actual, bins = 10) {
  const min = Math.min(...expected, ...actual);
  const max = Math.max(...expected, ...actual);
  const width = (max - min) / bins || 1;
  const histogram = values => {
    const counts = new Array(bins).fill(0);
    for (const value of values) counts[Math.min(bins - 1, Math.floor((value - min) / width))] += 1;
    return counts.map(count => Math.max(count / values.length, 1e-4));
  };
  const e = histogram(expected);
  const a = histogram(actual);
  return e.reduce((sum, ei, i) => sum + (a[i] - ei) * Math.log(a[i] / ei), 0);
}

// Robustness: a tiny perturbation of the amount must not flip decisions for
// transactions far from the threshold.
export function flipRate(model, rows, { epsilon = 0.01, margin = 0.1 } = {}) {
  const confident = rows.filter(row => Math.abs(predictProbability(model, row.x) - 0.5) > margin);
  const flips = confident.filter(row => (predictProbability(model, row.x) >= 0.5) !== (predictProbability(model, [row.x[0] + epsilon, ...row.x.slice(1)]) >= 0.5));
  return confident.length === 0 ? 0 : flips.length / confident.length;
}

// Fairness: equal-opportunity gap (difference in recall between groups).
export function equalOpportunityGap(slices) {
  const recalls = Object.values(slices).map(metrics => metrics.recall).filter(recall => recall !== null);
  return Math.max(...recalls) - Math.min(...recalls);
}
