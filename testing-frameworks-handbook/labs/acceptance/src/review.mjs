// A review sign-off is bound to the exact feature text it approved. Editing
// the examples invalidates earlier sign-offs, so "reviewed" always means
// "these examples, by these roles".
import { createHash } from 'node:crypto';

export const featureDigest = text => createHash('sha256').update(text).digest('hex');

export function reviewStatus(record, featureText) {
  const digest = featureDigest(featureText);
  const current = record.reviews.filter(review => review.featureSha256 === digest);
  const stale = record.reviews.filter(review => review.featureSha256 !== digest).map(review => review.role);
  const missing = record.requiredRoles.filter(role => !current.some(review => review.role === role && review.reviewer && review.date));
  return { digest, agreed: missing.length === 0, missing, stale };
}
