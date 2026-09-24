// Security findings are triaged by exploit impact, not counted. Every scanner
// finding must match a ledger entry with an owner and a deadline: either a fix
// SLA (open) or a suppression expiry with a rationale.
export const SLA_DAYS = Object.freeze({ critical: 7, high: 30, medium: 90, low: 180 });
const DAY = 86_400_000;

export function findingKey(finding) {
  return `${finding.source}:${finding.rule}:${finding.path}`;
}

export function validateLedger(ledger, today) {
  const errors = [];
  const now = Date.parse(`${today}T00:00:00Z`);
  const keys = new Set();
  for (const entry of ledger.findings) {
    const where = `finding ${entry.id ?? '(missing id)'}`;
    const key = findingKey(entry);
    if (keys.has(key)) errors.push(`${where}: duplicate ${key}`);
    keys.add(key);
    for (const field of ['id', 'source', 'rule', 'path', 'owner', 'impact', 'openedAt']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') errors.push(`${where}: ${field} is required`);
    }
    if (!(entry.severity in SLA_DAYS)) errors.push(`${where}: severity must be one of ${Object.keys(SLA_DAYS).join(', ')}`);
    if (entry.status === 'suppressed') {
      if (!entry.rationale) errors.push(`${where}: suppression needs a rationale`);
      const expires = Date.parse(`${entry.suppressionExpires}T00:00:00Z`);
      if (Number.isNaN(expires)) errors.push(`${where}: suppressionExpires is required`);
      else if (expires < now) errors.push(`${where}: suppression expired on ${entry.suppressionExpires}`);
      else if (expires - now > 180 * DAY) errors.push(`${where}: suppressions must be re-reviewed within 180 days`);
    } else if (entry.status === 'open') {
      const due = Date.parse(`${entry.openedAt}T00:00:00Z`) + SLA_DAYS[entry.severity] * DAY;
      if (due < now) errors.push(`${where}: ${entry.severity} SLA of ${SLA_DAYS[entry.severity]} days breached`);
    } else {
      errors.push(`${where}: status must be open or suppressed`);
    }
  }
  return errors;
}

export function reconcile(findings, ledger) {
  const known = new Map(ledger.findings.map(entry => [findingKey(entry), entry]));
  const seen = new Set();
  const untriaged = [];
  for (const finding of findings) {
    const key = findingKey(finding);
    if (known.has(key)) seen.add(key);
    else untriaged.push(finding);
  }
  const resolved = [...known.keys()].filter(key => !seen.has(key));
  return { untriaged, resolved };
}
