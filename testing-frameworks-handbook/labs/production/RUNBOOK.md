# Checkout runbook

Every alert in `src/canary.mjs` `ALERT_ROUTES` links here. Each section says
what the alert means, what to look at first, and the first safe action.

## checkout-error-budget-burn

- **Meaning**: the 1 h and 5 min windows both burn the 99.9% availability budget
  at >= 14.4x (page) or >= 6x (ticket).
- **Look first**: the canary dashboard (baseline vs canary error rate), then
  failing spans grouped by `http.route` and `deployment.version` in the trace
  store. Search logs by the `traceId` from a failing span.
- **First safe action**: if a canary is running, roll it back
  (`router.rollback()`); if a flag cohort changed, flip the kill switch.
- **Escalate**: payments on-call if spans show `payment.capture` errors.

## runtime-invariant-violation

- **Meaning**: an order was priced with `total != subtotal - discount` or a
  discount outside `[0, subtotal]`.
- **Look first**: the violating order's trace (`checkout.price` span attributes
  `cart.lines`, `pricing.version`, `flag.bundle_discount`).
- **First safe action**: kill the pricing flag; do not refund automatically —
  finance reconciles affected orders from the invariant log.

## synthetic-check-failure

- **Meaning**: the synthetic account's checkout journey failed.
- **Look first**: the synthetic run's trace; synthetic orders are tagged
  `synthetic=true` and excluded from business metrics.
- **First safe action**: re-run once to separate probe failure from product
  failure; synthetic data is cleaned up idempotently by tag.
