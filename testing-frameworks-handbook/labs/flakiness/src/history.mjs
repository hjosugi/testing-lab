// Synthetic CI history with known ground truth, so flake analysis can be
// scored: a broken runner host, an order-dependent shared fixture, one
// genuinely random flaky test, and a real regression.
import { mulberry32, shuffled } from './random.mjs';

export const TESTS = Object.freeze([
  { id: 'checkout-total', service: 'none', fixture: 'pure' },
  { id: 'checkout-discount', service: 'none', fixture: 'pure' },
  { id: 'payment-capture', service: 'payments', fixture: 'http' },
  { id: 'payment-refund', service: 'payments', fixture: 'http' },
  { id: 'payment-webhook', service: 'payments', fixture: 'http' },
  { id: 'orders-save', service: 'db', fixture: 'db-shared' },
  { id: 'orders-cleanup', service: 'db', fixture: 'db-shared' },
  { id: 'orders-list', service: 'db', fixture: 'db-shared' },
  { id: 'email-receipt', service: 'smtp', fixture: 'http' },
  { id: 'ui-timer', service: 'none', fixture: 'clock' },
]);

export const HOSTS = Object.freeze(['runner-1', 'runner-2', 'runner-3', 'runner-7']);

export function generateHistory({ seed = 2026, runs = 60, regressionFromRun = 45, maxRetries = 1 } = {}) {
  const random = mulberry32(seed);
  const attempts = [];
  for (let run = 1; run <= runs; run += 1) {
    const host = HOSTS[Math.floor(random() * HOSTS.length)];
    const orderSeed = Math.floor(random() * 1e9);
    const order = shuffled(TESTS.map(test => test.id), orderSeed);
    const cleanupIndex = order.indexOf('orders-cleanup');
    order.forEach((testId, position) => {
      const test = TESTS.find(candidate => candidate.id === testId);
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        let passed = true;
        let cause = null;
        // Systemic: runner-7 cannot resolve the payments sandbox host.
        if (host === 'runner-7' && test.service === 'payments' && attempt === 0) { passed = false; cause = 'host-dns'; }
        // Order dependence: list sees an empty table if cleanup ran first in
        // the same worker; the retry runs alone and passes.
        if (testId === 'orders-list' && cleanupIndex < position && attempt === 0) { passed = false; cause = 'order-dependent-fixture'; }
        // Genuine timing flake.
        if (testId === 'ui-timer' && random() < 0.06) { passed = false; cause = 'timing'; }
        // Real regression: fails on every attempt.
        if (testId === 'checkout-total' && run >= regressionFromRun) { passed = false; cause = 'regression'; }
        attempts.push({ runId: run, testId, attempt, passed, host, worker: `w${(position % 2) + 1}`, service: test.service, fixture: test.fixture, orderSeed, position, groundTruth: cause });
        if (passed) break;
      }
    });
  }
  return attempts;
}
