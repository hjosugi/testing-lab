import { createHash } from 'node:crypto';

// Test secrets are derived from a label and carry a "test-only" prefix, so a
// fixture can never hold a production credential and the secret scanner can
// tell synthetic material from real keys.
export const syntheticSecret = label => `test-only-${label}-${createHash('sha256').update(label).digest('hex').slice(0, 24)}`;
