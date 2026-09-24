import test from 'node:test';
import assert from 'node:assert/strict';
import { backoffMs, CircuitBreaker, CircuitOpenError } from '../src/payments.mjs';
import { mulberry32, Simulation } from '../src/sim.mjs';
import { findFailingSeed, invariantViolations, runScenario } from '../src/scenario.mjs';

const HOSTILE = { dropRate: 0.2, duplicateRate: 0.2, minDelayMs: 1, maxDelayMs: 150 };

test('determinism: the same seed replays the identical event trace; another seed does not', async () => {
  const a = await runScenario({ seed: 42, faults: HOSTILE });
  const b = await runScenario({ seed: 42, faults: HOSTILE });
  const c = await runScenario({ seed: 43, faults: HOSTILE });
  assert.equal(a.traceHash, b.traceHash);
  assert.deepEqual(a.trace, b.trace);
  assert.notEqual(a.traceHash, c.traceHash);
  assert.ok(a.trace.some(event => event.event === 'drop-response'), 'faults actually fired');
  assert.ok(a.trace.some(event => event.event === 'duplicate-request'));
});

test('idempotency: retries through drops, duplicates, and reordering never double charge (50 seeds)', async () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const result = await runScenario({ seed, faults: HOSTILE });
    assert.deepEqual(invariantViolations(result), [], `seed ${seed}`);
    assert.ok(result.charges <= result.succeeded + result.failed, `seed ${seed}: at most one charge per checkout`);
  }
});

test('seed reproduction: removing the idempotency key is found by seed search and replays identically', async () => {
  const found = await findFailingSeed({ seeds: Array.from({ length: 50 }, (_, i) => i + 1), faults: HOSTILE, useIdempotencyKey: false });
  assert.notEqual(found, null, 'the defect is reachable');
  assert.match(found.violations[0], /double charge/);
  const replay = await runScenario({ seed: found.seed, faults: HOSTILE, useIdempotencyKey: false });
  assert.equal(replay.traceHash, found.result.traceHash, `seed ${found.seed} reproduces the failing schedule exactly`);
  assert.deepEqual(replay.duplicated, found.result.duplicated);
});

test('retry/backoff: an outage shorter than the retry budget is absorbed; full jitter stays within the cap', async () => {
  const result = await runScenario({ seed: 7, faults: { minDelayMs: 1, maxDelayMs: 5 }, failUntilMs: 400 });
  assert.equal(result.succeeded, 20);
  assert.ok(result.maxAttempts > 1, 'some checkouts needed retries');
  const random = mulberry32(1);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sleep = backoffMs(attempt, random);
    assert.ok(sleep >= 0 && sleep <= Math.min(2_000, 50 * 2 ** attempt));
  }
});

test('retry budget: a long outage fails explicitly instead of hanging', async () => {
  const result = await runScenario({ seed: 7, faults: { minDelayMs: 1, maxDelayMs: 5 }, failUntilMs: 60_000, orders: 5 });
  assert.equal(result.failed, 5);
  assert.equal(result.unfinished, 0);
  assert.equal(result.charges, 0);
});

test('circuit breaker: opens after consecutive failures, fails fast, half-opens, and closes on success', async () => {
  let clock = 0;
  const transitions = [];
  const breaker = new CircuitBreaker({ now: () => clock, failureThreshold: 3, cooldownMs: 1_000, onTransition: state => transitions.push(state) });
  const fail = () => Promise.reject(new Error('503'));
  for (let i = 0; i < 3; i += 1) await assert.rejects(breaker.call(fail), /503/);
  assert.equal(breaker.state, 'open');
  let called = false;
  await assert.rejects(breaker.call(async () => { called = true; }), CircuitOpenError);
  assert.equal(called, false, 'open breaker does not touch the dependency');
  clock += 1_000;
  assert.equal(breaker.state, 'half-open');
  await assert.rejects(breaker.call(fail), /503/);
  assert.equal(breaker.state, 'open', 'a failed probe re-opens immediately');
  clock += 1_000;
  assert.equal(await breaker.call(async () => 'ok'), 'ok');
  assert.equal(breaker.state, 'closed');
  assert.deepEqual(transitions, ['open', 'open', 'closed']);
});

test('simulated outage with breaker: breaker opens during the outage and every checkout still finishes', async () => {
  const result = await runScenario({ seed: 11, faults: { minDelayMs: 1, maxDelayMs: 5 }, failUntilMs: 1_500, breakerOptions: { failureThreshold: 3, cooldownMs: 300 } });
  assert.ok(result.transitions.some(transition => transition.state === 'open'));
  assert.equal(result.unfinished, 0);
  assert.deepEqual(result.duplicated, []);
  // Design finding recorded in README: with a 1.5 s outage the open breaker
  // makes retries fail fast, so every checkout fails explicitly and the
  // failing provider receives far fewer requests than without a breaker.
  const withoutBreaker = await runScenario({ seed: 11, faults: { minDelayMs: 1, maxDelayMs: 5 }, failUntilMs: 1_500 });
  const received = run => run.trace.filter(event => event.event === 'provider-received').length;
  assert.equal(result.failed, 20);
  assert.ok(received(result) < received(withoutBreaker) / 2, `${received(result)} vs ${received(withoutBreaker)} provider requests`);
});

test('disk seam: fsync failure and torn writes are injectable and reproducible', () => {
  const outcome = seed => {
    const sim = new Simulation({ seed, faults: { fsyncFailureRate: 0.3, tornWriteRate: 0.3 } });
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      sim.disk.write(`k${i}`, { value: i });
      try {
        sim.disk.fsync();
        results.push(sim.disk.read(`k${i}`)?.torn ? 'torn' : 'ok');
      } catch {
        results.push('eio');
        sim.disk.crash();
      }
    }
    return results;
  };
  const first = outcome(5);
  assert.deepEqual(outcome(5), first);
  assert.ok(first.includes('eio') && first.includes('torn') && first.includes('ok'), first.join(','));
});
