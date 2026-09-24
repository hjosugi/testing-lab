import { Simulation } from './sim.mjs';
import { CircuitBreaker, createPaymentClient, createProvider } from './payments.mjs';

// One simulated run: `orders` checkouts start at seeded times, the provider is
// unavailable until `failUntilMs`, and the network applies `faults`.
export async function runScenario({ seed, faults = {}, orders = 20, useIdempotencyKey = true, failUntilMs = 0, breakerOptions }) {
  const sim = new Simulation({ seed, faults });
  const provider = createProvider({ failUntilMs, now: () => sim.now() });
  sim.network.listen('provider', message => {
    sim.record('provider-received', { id: message.id });
    return provider.handle(message);
  });
  const transitions = [];
  const breaker = breakerOptions
    ? new CircuitBreaker({ now: () => sim.now(), ...breakerOptions, onTransition: state => { transitions.push({ at: sim.now(), state }); sim.record(`breaker-${state}`); } })
    : undefined;
  const client = createPaymentClient({
    transport: (message, options) => sim.network.call('provider', message, options),
    sleep: ms => sim.sleep(ms),
    random: sim.random,
    now: () => sim.now(),
    useIdempotencyKey,
    breaker,
  });
  const tasks = Array.from({ length: orders }, (_, index) => {
    const orderId = `o-${index + 1}`;
    return sim.spawn(orderId, async () => {
      await sim.sleep(Math.floor(sim.random() * 500));
      const result = await client.charge({ orderId, amount: 1_000 + index });
      sim.record('charge-result', { orderId, status: result.status, attempts: result.attempts });
      return result;
    });
  });
  await sim.run({ untilMs: 120_000 });

  const chargesPerOrder = new Map();
  for (const charge of provider.charges) chargesPerOrder.set(charge.orderId, (chargesPerOrder.get(charge.orderId) ?? 0) + 1);
  const duplicated = [...chargesPerOrder.entries()].filter(([, count]) => count > 1).map(([orderId]) => orderId);
  const succeeded = tasks.filter(task => task.done && !task.error).length;
  const failed = tasks.filter(task => task.done && task.error).length;
  const unfinished = tasks.filter(task => !task.done).length;
  return {
    seed,
    traceHash: sim.traceHash(),
    events: sim.trace.length,
    charges: provider.charges.length,
    duplicated,
    succeeded,
    failed,
    unfinished,
    transitions,
    maxAttempts: Math.max(0, ...tasks.filter(task => task.value).map(task => task.value.attempts)),
    trace: sim.trace,
  };
}

export function invariantViolations(result) {
  const violations = [];
  if (result.duplicated.length > 0) violations.push(`double charge: ${result.duplicated.join(', ')}`);
  if (result.unfinished > 0) violations.push(`${result.unfinished} checkout(s) never finished`);
  return violations;
}

// Seed search: the first seed whose run violates an invariant, or null.
export async function findFailingSeed({ seeds, ...scenario }) {
  for (const seed of seeds) {
    const result = await runScenario({ seed, ...scenario });
    const violations = invariantViolations(result);
    if (violations.length > 0) return { seed, violations, result };
  }
  return null;
}
