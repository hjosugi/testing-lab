// Coupon rules for checkout. The acceptance examples describe this behavior
// in business language; unit tests pin each rule at the lowest level.
export class CouponError extends Error {
  constructor(code) { super(code); this.name = 'CouponError'; this.code = code; }
}

// R1 percentage coupons apply to the item subtotal only (not shipping)
// R2 a coupon needs a minimum subtotal
// R3 a coupon can be used once per customer
// R4 expired coupons are rejected; the expiry day itself is still valid
// R5 the discount never makes the item subtotal negative
export function applyCoupon({ subtotal, shipping, coupon, customer, today, redemptions }) {
  if (today > coupon.expiresOn) throw new CouponError('expired');
  if (subtotal < coupon.minimumSubtotal) throw new CouponError('below-minimum');
  if (redemptions.has(`${coupon.code}:${customer}`)) throw new CouponError('already-used');
  const raw = coupon.kind === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  const discount = Math.min(raw, subtotal);
  redemptions.add(`${coupon.code}:${customer}`);
  return { discount, total: subtotal - discount + shipping };
}
