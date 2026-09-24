// Golden/visual approval workflow: deterministic rendering (fixed viewport,
// clock, no animation, no fonts), pixel diff with a perceptual threshold and
// justified masks, and baselines that only count as approved when a named
// reviewer recorded a reason for that exact content hash.
import { createHash } from 'node:crypto';

export const VIEWPORT = Object.freeze({ width: 64, height: 40 });
const COLORS = { bg: [255, 255, 255], header: [30, 60, 120], price: [200, 40, 40], button: [20, 140, 60], stamp: [150, 150, 150] };

// Layout -> RGB pixels. Text is drawn as blocks whose width follows the
// string length, so content changes are visible without font rendering.
export function renderCheckout({ total, itemCount, timestamp, buttonLabel = 'Pay' }) {
  const { width, height } = VIEWPORT;
  const pixels = new Uint8Array(width * height * 3).fill(255);
  const rect = (x, y, w, h, color) => {
    for (let yy = y; yy < Math.min(height, y + h); yy += 1) for (let xx = x; xx < Math.min(width, x + w); xx += 1) pixels.set(color, (yy * width + xx) * 3);
  };
  rect(0, 0, width, 6, COLORS.header);
  for (let i = 0; i < itemCount; i += 1) rect(4, 9 + i * 4, 40, 2, COLORS.header);
  rect(4, 26, String(total).length * 4, 3, COLORS.price);
  rect(4, 32, buttonLabel.length * 5, 5, COLORS.button);
  rect(44, 35, String(timestamp).length, 3, COLORS.stamp); // volatile: masked
  return { width, height, pixels };
}

export function diff(a, b, { masks = [] } = {}) {
  if (a.width !== b.width || a.height !== b.height) return { comparable: false, reason: 'viewport differs' };
  const masked = (x, y) => masks.some(mask => x >= mask.x && x < mask.x + mask.w && y >= mask.y && y < mask.y + mask.h);
  let changed = 0;
  let box = null;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      if (masked(x, y)) continue;
      const i = (y * a.width + x) * 3;
      if (a.pixels[i] !== b.pixels[i] || a.pixels[i + 1] !== b.pixels[i + 1] || a.pixels[i + 2] !== b.pixels[i + 2]) {
        changed += 1;
        box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
      }
    }
  }
  return { comparable: true, changedPixels: changed, ratio: changed / (a.width * a.height), box };
}

export function toPpm({ width, height, pixels }) {
  return Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), Buffer.from(pixels)]);
}

export function fromPpm(buffer) {
  const header = buffer.subarray(0, 32).toString('latin1').match(/^P6\n(\d+) (\d+)\n255\n/);
  return { width: Number(header[1]), height: Number(header[2]), pixels: new Uint8Array(buffer.subarray(header[0].length)) };
}

export const sha256 = content => createHash('sha256').update(content).digest('hex');

// Mask audit: each mask needs a reason and together they may hide at most
// `maxMaskedRatio` of the viewport; the threshold must stay small.
export function auditConfig(config, { maxMaskedRatio = 0.05, maxThreshold = 0.002 } = {}) {
  const problems = [];
  const area = config.masks.reduce((sum, mask) => sum + mask.w * mask.h, 0);
  if (area / (VIEWPORT.width * VIEWPORT.height) > maxMaskedRatio) problems.push(`masks hide ${(area / (VIEWPORT.width * VIEWPORT.height) * 100).toFixed(1)}% of the viewport`);
  for (const mask of config.masks) if (!mask.reason) problems.push(`mask at ${mask.x},${mask.y} has no reason`);
  if (config.threshold > maxThreshold) problems.push(`threshold ${config.threshold} exceeds ${maxThreshold}`);
  return problems;
}

// Approval gate: every baseline's current hash needs its own approval with a
// reviewer and a specific reason; one generic reason for many files is a
// bulk update and is rejected.
export function approvalProblems(baselines, approvals, { maxSharedReason = 1 } = {}) {
  const problems = [];
  for (const { name, content } of baselines) {
    const hash = sha256(content);
    const approval = approvals.find(entry => entry.baseline === name && entry.sha256 === hash);
    if (!approval) { problems.push(`${name}: baseline ${hash.slice(0, 12)} has no approval`); continue; }
    if (!approval.reviewer || !approval.reason || approval.reason.length < 20) problems.push(`${name}: approval needs a reviewer and a specific reason`);
    if (approval.reviewer === approval.author) problems.push(`${name}: author cannot approve their own baseline`);
  }
  const reasons = new Map();
  for (const approval of approvals) reasons.set(approval.reason, (reasons.get(approval.reason) ?? 0) + 1);
  for (const [reason, count] of reasons) if (count > maxSharedReason) problems.push(`bulk update: ${count} baselines share the reason "${reason}"`);
  return problems;
}
