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

// Kendall tau-b (handles ties), as used by Inozemtseva & Holmes.
export function kendallTau(xs, ys) {
  let concordant = 0; let discordant = 0; let tiesX = 0; let tiesY = 0;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const dx = Math.sign(xs[i] - xs[j]);
      const dy = Math.sign(ys[i] - ys[j]);
      if (dx === 0 && dy === 0) continue;
      if (dx === 0) tiesX += 1;
      else if (dy === 0) tiesY += 1;
      else if (dx === dy) concordant += 1;
      else discordant += 1;
    }
  }
  const denominator = Math.sqrt((concordant + discordant + tiesX) * (concordant + discordant + tiesY));
  return denominator === 0 ? 0 : (concordant - discordant) / denominator;
}

export const round = (value, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
export const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
