// Quarantine is a time-boxed, owned exception, and the required check is
// computed from first attempts so retries can never make it look green.
export const CAUSES = Object.freeze(['host-infra', 'order-dependent-fixture', 'timing', 'external-service', 'unknown']);
const DAY = 86_400_000;

export function validateQuarantine(entries, today) {
  const errors = [];
  const now = Date.parse(`${today}T00:00:00Z`);
  for (const entry of entries) {
    const where = `quarantine ${entry.testId}`;
    if (!entry.owner) errors.push(`${where}: owner is required`);
    if (!CAUSES.includes(entry.cause)) errors.push(`${where}: cause must be one of ${CAUSES.join(', ')}`);
    if (!entry.issue) errors.push(`${where}: tracking issue is required`);
    const since = Date.parse(`${entry.quarantinedAt}T00:00:00Z`);
    const expires = Date.parse(`${entry.expires}T00:00:00Z`);
    if (Number.isNaN(since) || Number.isNaN(expires)) errors.push(`${where}: quarantinedAt and expires are required`);
    else {
      if (expires - since > 30 * DAY) errors.push(`${where}: quarantine may last at most 30 days`);
      if (expires < now) errors.push(`${where}: expired on ${entry.expires}`);
    }
  }
  return errors;
}

export function requiredCheck(classifiedRun, quarantine) {
  const quarantined = new Set(quarantine.map(entry => entry.testId));
  const blocking = [];
  const reported = [];
  for (const row of classifiedRun) {
    if (row.status === 'pass') continue;
    const detail = { testId: row.testId, status: row.status, attempts: row.attempts };
    if (quarantined.has(row.testId)) reported.push(detail);
    else blocking.push({ ...detail, reason: row.status === 'flaky' ? 'first attempt failed; the retry pass is recorded as flaky, not green' : 'failed every attempt' });
  }
  return { passed: blocking.length === 0, blocking, quarantinedFailures: reported };
}

// Diagnosis time: first flaky occurrence -> quarantine/classification date.
export function diagnosisDays(classified, quarantine, runDate) {
  return quarantine.map(entry => {
    const firstRun = Math.min(...classified.filter(row => row.testId === entry.testId && row.status !== 'pass').map(row => row.runId));
    return { testId: entry.testId, days: Math.round((Date.parse(`${entry.quarantinedAt}T00:00:00Z`) - runDate(firstRun)) / DAY) };
  });
}
