// A rubric-based fake "LLM-as-judge" and its calibration against a human-
// labelled sample. The judge is only trusted for gating when its agreement
// with humans (Cohen's kappa) clears a threshold.
const tokenize = text => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// Rubric: pass when the answer mentions every required term and none of the
// forbidden claims. `lenient` models a miscalibrated judge that ignores
// forbidden claims (it rewards confident but wrong answers).
export function judge(item, { lenient = false } = {}) {
  const tokens = new Set(tokenize(item.answer));
  const hasRequired = item.rubric.required.every(term => tokens.has(term));
  const hasForbidden = item.rubric.forbidden.some(term => tokens.has(term));
  return hasRequired && (lenient || !hasForbidden) ? 1 : 0;
}

export function cohensKappa(a, b) {
  const n = a.length;
  const observed = a.filter((value, i) => value === b[i]).length / n;
  const pa = a.filter(Boolean).length / n;
  const pb = b.filter(Boolean).length / n;
  const expected = pa * pb + (1 - pa) * (1 - pb);
  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
}

export function calibrate(sample, options) {
  const machine = sample.map(item => judge(item, options));
  const human = sample.map(item => item.human);
  const disagreements = sample.filter((item, i) => machine[i] !== human[i]).map(item => item.id);
  return { n: sample.length, kappa: Math.round(cohensKappa(machine, human) * 1000) / 1000, disagreements };
}
