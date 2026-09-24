import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { ALERT_ROUTES, analyzeCanary, burnRateAlert } from '../src/canary.mjs';
import { createRouter, createStore, invariantViolations, sanitizeForShadow, shadowCompare, versions } from '../src/service.mjs';
import { createTelemetry, parseTraceparent } from '../src/telemetry.mjs';

const plan = JSON.parse(readFileSync(new URL('../verification-plan.json', import.meta.url), 'utf8'));
const runbook = readFileSync(new URL('../RUNBOOK.md', import.meta.url), 'utf8');

const cart = lineCount => ({ id: `o-${lineCount}`, customerId: 'alice@example.test', lines: Array.from({ length: lineCount }, (_, i) => ({ sku: `s${i}`, quantity: 1, unitPrice: 1_000 })) });

test('pre-deploy pricing contract: every runtime invariant is also a pre-deploy test (monitoring does not replace it)', () => {
  for (const lines of [1, 2, 3, 5]) assert.deepEqual(invariantViolations(cart(lines), versions.v1(cart(lines))), []);
  assert.deepEqual(invariantViolations(cart(2), versions.v2(cart(2), { bundleDiscount: true })), []);
  // The defect is in the pre-deploy suite too: it would have blocked the
  // release, and production verification is the second net, not the first.
  assert.deepEqual(invariantViolations(cart(3), versions.v2(cart(3), { bundleDiscount: true })), ['total != subtotal - discount']);
  const invariants = ['total != subtotal - discount', 'discount out of range', 'subtotal != sum(lines)'];
  assert.deepEqual(Object.keys(plan.preDeployCoverage).sort(), invariants.sort());
});

test('synthetic accounts are tagged, excluded from business metrics, and cleaned up idempotently', () => {
  const store = createStore();
  store.save({ id: 'real-1', synthetic: false });
  for (let i = 0; i < 3; i += 1) store.save({ id: `synthetic-${i}`, synthetic: true });
  assert.deepEqual(store.businessOrders().map(order => order.id), ['real-1']);
  assert.equal(store.cleanupSynthetic(), 3);
  assert.equal(store.cleanupSynthetic(), 0, 'a second cleanup is a no-op');
  assert.deepEqual([...store.orders.keys()], ['real-1']);
});

test('canary: routing is sticky per customer, abort needs enough samples, and rollback sends everyone back', () => {
  const router = createRouter({ canaryPercent: plan.blastRadius.maxCanaryPercent });
  const customers = Array.from({ length: 2_000 }, (_, i) => `customer-${i}`);
  const onCanary = customers.filter(customer => router.route(customer).version === 'v2');
  assert.ok(onCanary.length > 40 && onCanary.length < 160, `~5% on canary, got ${onCanary.length}`);
  assert.deepEqual(customers.map(customer => router.route(customer).version), customers.map(customer => router.route(customer).version), 'sticky');

  const tally = { baseline: { requests: 0, errors: 0 }, canary: { requests: 0, errors: 0, invariantViolations: 0 } };
  customers.forEach((customer, index) => {
    const { version } = router.route(customer);
    const order = cart((index % 4) + 1);
    const result = version === 'v2' ? versions.v2(order, { bundleDiscount: true }) : versions.v1(order);
    const side = version === 'v2' ? tally.canary : tally.baseline;
    side.requests += 1;
    if (version === 'v2' && invariantViolations(order, result).length > 0) tally.canary.invariantViolations += 1;
  });
  assert.equal(analyzeCanary({ ...tally, canary: { ...tally.canary, requests: 10 } }).decision, 'continue', 'too few samples to decide');
  const decision = analyzeCanary(tally);
  assert.equal(decision.decision, 'abort');
  assert.match(decision.reason, /runtime invariant violation/);
  router.rollback();
  assert.ok(customers.every(customer => router.route(customer).version === 'v1'));
  assert.equal(analyzeCanary({ baseline: tally.baseline, canary: { requests: 100, errors: 0, invariantViolations: 0 } }).decision, 'promote');
});

test('feature flag: cohort size is bounded and the kill switch turns it off for everyone', () => {
  const router = createRouter({ flag: { name: 'bundle-discount', cohortPercent: plan.blastRadius.maxFlagCohortPercent, killSwitch: false } });
  const customers = Array.from({ length: 2_000 }, (_, i) => `c-${i}`);
  const enabled = customers.filter(customer => router.route(customer).bundleDiscount).length;
  assert.ok(enabled > 120 && enabled < 280, `~10% cohort, got ${enabled}`);
  router.kill();
  assert.equal(customers.filter(customer => router.route(customer).bundleDiscount).length, 0);
});

test('shadow traffic is sanitized, side-effect free, and surfaces the defect before exposure', () => {
  const orders = [1, 2, 3, 4].map(lines => ({ ...cart(lines), id: `order-${lines}`, email: 'alice@example.test', card: '4111111111111111' }));
  const store = createStore();
  const { mirrored, diffs, changedTotals } = shadowCompare(orders);
  for (const copy of mirrored) {
    assert.deepEqual(Object.keys(copy).sort(), ['customerId', 'id', 'lines']);
    assert.doesNotMatch(JSON.stringify(copy), /alice|4111|order-/);
  }
  assert.equal(store.orders.size, 0, 'shadow never persists');
  assert.equal(changedTotals, 3, 'expected differences (new discount) are counted separately');
  assert.deepEqual(diffs.map(diff => diff.lines), [3, 4], 'invariant violations only for 3+ line carts');
  assert.equal(sanitizeForShadow(orders[0]).customerId, sanitizeForShadow(orders[0]).customerId, 'stable pseudonym for correlation');
});

test('SLO burn-rate alert pages on fast burn, tickets on slow burn, and routes to a runbook', () => {
  assert.equal(burnRateAlert({ windows: { long: { requests: 100_000, errors: 1_500 }, short: { requests: 8_000, errors: 150 } } }).severity, 'page');
  assert.equal(burnRateAlert({ windows: { long: { requests: 100_000, errors: 700 }, short: { requests: 8_000, errors: 60 } } }).severity, 'ticket');
  assert.equal(burnRateAlert({ windows: { long: { requests: 100_000, errors: 1_500 }, short: { requests: 8_000, errors: 2 } } }).severity, 'none', 'recovered: short window stops the page');
  for (const route of Object.values(ALERT_ROUTES)) {
    const anchor = route.runbook.split('#')[1];
    assert.match(runbook, new RegExp(`^## ${anchor}$`, 'm'), `${anchor} exists in the runbook`);
  }
});

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
}

test('critical flow trace: traceparent propagates checkout -> payment, spans form one tree, and logs carry the trace ID', async () => {
  const labels = { 'http.requests': ['service', 'route', 'status_class'] };
  const payment = createTelemetry({ service: 'payment', allowedLabels: labels });
  const checkout = createTelemetry({ service: 'checkout', allowedLabels: labels });
  const paymentServer = http.createServer((request, response) => {
    const span = payment.startSpan('payment.capture', { traceparent: request.headers.traceparent, attributes: { 'payment.method': 'card', card: '4111111111111111' } });
    payment.count('http.requests', { service: 'payment', route: '/capture', status_class: '5xx', customer_id: 'alice' });
    payment.log('error', 'capture declined by issuer for alice@example.test', { traceId: span.span.traceId, token: 'test-only-payment-token' });
    span.end('ERROR', 'issuer declined');
    response.writeHead(502).end('{"error":"declined"}');
  });
  const paymentUrl = await listen(paymentServer);
  const checkoutServer = http.createServer(async (request, response) => {
    const root = checkout.startSpan('checkout.submit', { attributes: { 'cart.lines': 2, email: 'alice@example.test' } });
    const status = await new Promise(resolve => {
      http.request(`${paymentUrl}/capture`, { method: 'POST', headers: { traceparent: root.traceparent } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); }).end();
    });
    checkout.log('warn', 'checkout failed: payment unavailable', { traceId: root.span.traceId, orderId: 'o-1', paymentStatus: status });
    checkout.count('http.requests', { service: 'checkout', route: '/checkout', status_class: '5xx', order_id: 'o-1' });
    root.end('ERROR', 'payment failed');
    response.writeHead(502).end();
  });
  const checkoutUrl = await listen(checkoutServer);
  try {
    await fetch(`${checkoutUrl}/checkout`, { method: 'POST' });
  } finally {
    checkoutServer.close();
    paymentServer.close();
  }
  const [root] = checkout.spans;
  const [child] = payment.spans;
  assert.equal(child.traceId, root.traceId, 'one trace across services');
  assert.equal(child.parentSpanId, root.spanId, 'payment span is a child of checkout');
  assert.equal(parseTraceparent(`00-${root.traceId}-${root.spanId}-01`).traceId, root.traceId);
  assert.deepEqual(checkout.otlp().resourceSpans[0].scopeSpans[0].spans.map(span => span.name), ['checkout.submit']);

  // Triage from artifacts only: both services' logs can be joined by trace ID
  // and each failing span says why.
  const logs = [...checkout.logs, ...payment.logs];
  assert.ok(logs.every(entry => entry.traceId === root.traceId));
  assert.deepEqual([root.status.code, child.status.code], ['ERROR', 'ERROR']);
  assert.match(child.status.message, /issuer declined/);

  // No secrets or PII in telemetry, and high-cardinality labels are refused.
  const telemetry = JSON.stringify({ spans: [...checkout.spans, ...payment.spans], logs, series: [checkout.series(), payment.series()] });
  assert.doesNotMatch(telemetry, /alice@example\.test|4111111111111111|test-only-payment-token/);
  assert.deepEqual([...checkout.rejectedLabels, ...payment.rejectedLabels].sort(), ['http.requests:customer_id', 'http.requests:order_id']);
  assert.deepEqual(Object.keys(payment.series()), ['http.requests{"service":"payment","route":"/capture","status_class":"5xx"}']);
});

test('metric cardinality: a per-metric series budget stops unbounded label values', () => {
  const telemetry = createTelemetry({ service: 'x', allowedLabels: { hits: ['route'] }, maxSeriesPerMetric: 3 });
  for (let i = 0; i < 10; i += 1) telemetry.count('hits', { route: `/orders/${i}` });
  assert.equal(Object.keys(telemetry.series()).length, 3);
  assert.equal(telemetry.rejectedLabels.filter(label => label === 'hits:series-limit').length, 7);
});

test('verification plan: blast radius and privacy are written down, and the plan says it is not yet reviewed', () => {
  assert.ok(plan.blastRadius.maxCanaryPercent <= 10 && plan.blastRadius.abortCriteria.length >= 3);
  assert.ok(plan.privacy.shadowTraffic && plan.privacy.telemetry && plan.privacy.syntheticAccounts);
  assert.equal(plan.reviewed, false, 'no review is claimed before SRE and the privacy owner sign it');
});
