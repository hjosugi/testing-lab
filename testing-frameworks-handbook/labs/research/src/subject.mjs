// Subject under test for the coverage/mutation experiment. `hit` records
// branch probes so coverage is measured without external tooling. The
// mutation operators in mutants.mjs rewrite this exact source text.
export function shippingFee({ subtotal, weightKg, express, member, region }, hit = () => {}) {
  if (subtotal < 0 || weightKg <= 0) { hit('b0'); throw new RangeError('invalid'); }
  let fee;
  if (region === 'remote') { hit('b1'); fee = 1200; } else { hit('b2'); fee = 600; }
  if (weightKg > 10) { hit('b3'); fee += Math.ceil((weightKg - 10) / 5) * 300; } else { hit('b4'); }
  if (express) { hit('b5'); fee = fee * 2; } else { hit('b6'); }
  if (member && subtotal >= 5000) { hit('b7'); fee = 0; } else if (subtotal >= 10000) { hit('b8'); fee = Math.floor(fee / 2); } else { hit('b9'); }
  return fee;
}
export const PROBES = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'];
