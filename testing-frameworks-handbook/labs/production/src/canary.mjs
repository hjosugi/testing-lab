// Canary analysis with minimum sample size, error/invariant comparison
// against the baseline, abort, and rollback.
export function analyzeCanary({ baseline, canary, minSamples = 50, maxErrorRateDelta = 0.01, maxInvariantViolations = 0 }) {
  if (canary.requests < minSamples) return { decision: 'continue', reason: `canary has ${canary.requests}/${minSamples} samples` };
  const rate = side => side.errors / Math.max(1, side.requests);
  const reasons = [];
  if (rate(canary) - rate(baseline) > maxErrorRateDelta) reasons.push(`error rate ${rate(canary).toFixed(3)} vs baseline ${rate(baseline).toFixed(3)}`);
  if (canary.invariantViolations > maxInvariantViolations) reasons.push(`${canary.invariantViolations} runtime invariant violation(s)`);
  return reasons.length > 0 ? { decision: 'abort', reason: reasons.join('; ') } : { decision: 'promote', reason: 'within thresholds' };
}

// Multi-window burn-rate alert for an availability SLO (Google SRE workbook
// style): page only when both the long and the short window burn fast.
export function burnRateAlert({ sloTarget = 0.999, windows }) {
  const budget = 1 - sloTarget;
  const burn = window => (window.errors / Math.max(1, window.requests)) / budget;
  const long = burn(windows.long);
  const short = burn(windows.short);
  const page = long >= 14.4 && short >= 14.4;
  const ticket = !page && long >= 6 && short >= 6;
  return { longBurn: Math.round(long * 10) / 10, shortBurn: Math.round(short * 10) / 10, severity: page ? 'page' : ticket ? 'ticket' : 'none' };
}

export const ALERT_ROUTES = Object.freeze({
  page: { receiver: 'checkout-oncall', runbook: 'labs/production/RUNBOOK.md#checkout-error-budget-burn' },
  ticket: { receiver: 'checkout-team-queue', runbook: 'labs/production/RUNBOOK.md#checkout-error-budget-burn' },
  invariant: { receiver: 'checkout-oncall', runbook: 'labs/production/RUNBOOK.md#runtime-invariant-violation' },
});
