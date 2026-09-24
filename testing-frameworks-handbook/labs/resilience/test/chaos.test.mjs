// Controlled chaos over real HTTP, and the semantic gap between the
// deterministic simulation and a real network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentClient, createProvider } from '../src/payments.mjs';
import { httpTransport, runExperiment, startFaultProxy, startProvider } from '../src/chaos.mjs';
import { mulberry32 } from '../src/sim.mjs';
import { runScenario } from '../src/scenario.mjs';

async function harness(seed) {
  const provider = createProvider();
  const upstream = await startProvider(provider);
  const proxy = await startFaultProxy(`${upstream.url}/charge`, { seed });
  const random = mulberry32(seed);
  const client = createPaymentClient({
    transport: httpTransport(`${proxy.url}/charge`),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    random,
    now: () => Date.now(),
    timeoutMs: 300,
    maxAttempts: 6,
  });
  let order = 0;
  const probe = async () => {
    order += 1;
    try { return (await client.charge({ orderId: `probe-${seed}-${order}`, amount: 100 })).status === 'charged'; } catch { return false; }
  };
  return { provider, proxy, client, probe, close: async () => { await proxy.close(); await upstream.close(); } };
}

const steadyState = rate => rate >= 0.99;

test('chaos: a tolerable fault within a 30% blast radius keeps the steady state and completes', async () => {
  const h = await harness(3);
  try {
    const result = await runExperiment({
      name: 'provider 503 at 50% for 30% of calls',
      probe: h.probe, proxy: h.proxy,
      faults: { errorRate: 0.5 }, blastRadius: 0.3,
      steadyState, abortWhen: rate => rate < 0.9, maxProbes: 30,
    });
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.equal(result.during, 1, 'retries absorb the injected 503s');
    assert.ok(h.proxy.stats.injectedErrors > 0, 'faults were actually injected');
    assert.equal(result.restored, true);
    assert.equal(h.proxy.active, false, 'rolled back at the end');
  } finally {
    await h.close();
  }
});

test('chaos: breaching the abort condition stops injection early and rollback restores the steady state', async () => {
  const h = await harness(4);
  try {
    const result = await runExperiment({
      name: 'total provider outage for all calls',
      probe: h.probe, proxy: h.proxy,
      faults: { errorRate: 1 }, blastRadius: 1,
      steadyState, abortWhen: rate => rate < 0.9, windowSize: 5, maxProbes: 40,
    });
    assert.equal(result.status, 'aborted');
    assert.ok(result.probes < 40, `aborted after ${result.probes} probes, not at the end`);
    assert.equal(h.proxy.active, false, 'fault injection is off after abort');
    assert.equal(result.after, 1);
    assert.equal(result.restored, true);
  } finally {
    await h.close();
  }
});

test('chaos: an experiment does not start when the steady state is not met beforehand', async () => {
  const h = await harness(5);
  try {
    const result = await runExperiment({ name: 'guard', probe: async () => false, proxy: h.proxy, faults: { errorRate: 1 }, blastRadius: 1, steadyState, abortWhen: () => true });
    assert.equal(result.status, 'not-started');
    assert.equal(h.proxy.active, false);
  } finally {
    await h.close();
  }
});

test('semantic gap: lost responses keep the no-double-charge invariant in both sim and real HTTP, with different mechanics', async () => {
  const h = await harness(6);
  try {
    h.proxy.inject({ dropResponseRate: 0.5 }, 1);
    const results = [];
    for (let i = 1; i <= 10; i += 1) results.push(await h.client.charge({ orderId: `gap-${i}`, amount: 100 }));
    h.proxy.rollback();
    const perOrder = new Map();
    for (const charge of h.provider.charges) perOrder.set(charge.orderId, (perOrder.get(charge.orderId) ?? 0) + 1);
    assert.ok(h.proxy.stats.droppedResponses > 0, 'responses were lost after the upstream charge');
    assert.deepEqual([...perOrder.values()].filter(count => count > 1), [], 'real HTTP: no double charge');
    assert.ok(results.every(result => result.status === 'charged'));

    const sim = await runScenario({ seed: 6, faults: { dropRate: 0.25, minDelayMs: 1, maxDelayMs: 20 }, orders: 10 });
    assert.deepEqual(sim.duplicated, [], 'simulation: no double charge');
    // Documented gap: in the simulation a lost response is only observable as
    // a timeout after timeoutMs of virtual time; over TCP the proxy's socket
    // reset surfaces immediately as ECONNRESET, so real retries happen sooner
    // and the simulation never exercises connection-level errors.
    assert.ok(sim.trace.some(event => event.event === 'timeout'));
  } finally {
    await h.close();
  }
});
