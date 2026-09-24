// Step definitions: thin glue from business phrases to the domain API. No
// step reaches into UI or storage details, so the feature file survives a
// UI rewrite.
import { applyCoupon, CouponError } from './domain.mjs';
import { createRegistry } from './gherkin.mjs';

const REFUSALS = { 'the subtotal is below the minimum': 'below-minimum', 'it was already used': 'already-used', 'it has expired': 'expired' };

export function checkoutSteps() {
  const steps = createRegistry();
  const coupon = (world, code) => {
    world.coupons ??= new Map();
    if (!world.coupons.has(code)) world.coupons.set(code, { code });
    return world.coupons.get(code);
  };
  steps.define(/^the coupon "([^"]+)" takes (\d+)% off items$/, (world, code, percent) => Object.assign(coupon(world, code), { kind: 'percent', value: Number(percent) }));
  steps.define(/^the coupon "([^"]+)" takes (\d+) yen off items$/, (world, code, yen) => Object.assign(coupon(world, code), { kind: 'fixed', value: Number(yen) }));
  steps.define(/^"([^"]+)" needs an item subtotal of at least (\d+) yen$/, (world, code, minimum) => { coupon(world, code).minimumSubtotal = Number(minimum); });
  steps.define(/^"([^"]+)" is valid until (\d{4}-\d{2}-\d{2})$/, (world, code, day) => { coupon(world, code).expiresOn = day; });
  steps.define(/^a customer with items worth (\d+) yen and shipping of (\d+) yen$/, (world, items, shipping) => {
    world.cart = { subtotal: Number(items), shipping: Number(shipping) };
  });
  steps.define(/^a customer who already used "([^"]+)"$/, (world, code) => {
    world.redemptions ??= new Set();
    world.redemptions.add(`${code}:customer-1`);
  });
  steps.define(/^they use "([^"]+)" on (\d{4}-\d{2}-\d{2})$/, (world, code, day) => {
    world.redemptions ??= new Set();
    try {
      world.result = applyCoupon({ ...world.cart, coupon: coupon(world, code), customer: 'customer-1', today: day, redemptions: world.redemptions });
    } catch (error) {
      if (!(error instanceof CouponError)) throw error;
      world.refusal = error.code;
      world.result = { total: world.cart.subtotal + world.cart.shipping };
    }
  });
  steps.define(/^they pay (\d+) yen$/, (world, total) => {
    if (world.result.total !== Number(total)) throw new Error(`expected to pay ${total}, paid ${world.result.total}`);
  });
  steps.define(/^the coupon is refused because (.+)$/, (world, reason) => {
    if (world.refusal !== REFUSALS[reason]) throw new Error(`expected refusal "${REFUSALS[reason]}", got "${world.refusal ?? 'none'}"`);
  });
  return steps;
}
