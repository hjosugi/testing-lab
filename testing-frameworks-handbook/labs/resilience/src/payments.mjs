// Payment client with the resilience mechanisms under test, written against
// seams (clock, sleep, random, transport) so the same code runs inside the
// deterministic simulation and against a real HTTP fault proxy.

export class CircuitOpenError extends Error {
  constructor() { super('circuit open'); this.name = 'CircuitOpenError'; }
}

export class CircuitBreaker {
  #failures = 0;
  #openedAt = null;

  constructor({ now, failureThreshold = 3, cooldownMs = 1_000, onTransition = () => {} }) {
    Object.assign(this, { now, failureThreshold, cooldownMs, onTransition });
  }

  get state() {
    if (this.#openedAt === null) return 'closed';
    return this.now() - this.#openedAt >= this.cooldownMs ? 'half-open' : 'open';
  }

  async call(operation) {
    const state = this.state;
    if (state === 'open') throw new CircuitOpenError();
    try {
      const result = await operation();
      if (this.#openedAt !== null || this.#failures > 0) this.onTransition('closed');
      this.#failures = 0;
      this.#openedAt = null;
      return result;
    } catch (error) {
      this.#failures += 1;
      if (state === 'half-open' || this.#failures >= this.failureThreshold) {
        this.#openedAt = this.now();
        this.onTransition('open');
      }
      throw error;
    }
  }
}

// Full-jitter exponential backoff: sleep = random(0, min(cap, base * 2^n)).
export function backoffMs(attempt, random, { baseMs = 50, capMs = 2_000 } = {}) {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}

export function createPaymentClient({ transport, sleep, random, now, maxAttempts = 6, timeoutMs = 200, useIdempotencyKey = true, breaker }) {
  return {
    async charge({ orderId, amount }) {
      const idempotencyKey = useIdempotencyKey ? `charge:${orderId}` : undefined;
      let lastError;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          // A 5xx-style reply is a dependency failure for the breaker, not a
          // successful call that happens to carry an error payload.
          const run = async () => {
            const reply = await transport({ orderId, amount, idempotencyKey, id: `${orderId}#${attempt}` }, { timeoutMs });
            if (reply.status === 'unavailable') throw new Error('provider unavailable');
            return reply;
          };
          const reply = breaker ? await breaker.call(run) : await run();
          return { ...reply, attempts: attempt + 1 };
        } catch (error) {
          lastError = error;
        }
        if (attempt < maxAttempts - 1) await sleep(backoffMs(attempt, random));
      }
      throw Object.assign(new Error(`charge failed after ${maxAttempts} attempts: ${lastError.message}`), { cause: lastError, at: now() });
    },
  };
}

// Provider: charges once per idempotency key. Without a key, each delivered
// request is a new charge, which is what makes retries dangerous.
export function createProvider({ failUntilMs = 0, now = () => 0 } = {}) {
  const charges = [];
  const byKey = new Map();
  return {
    charges,
    handle(message) {
      if (now() < failUntilMs) return { status: 'unavailable' };
      if (message.idempotencyKey && byKey.has(message.idempotencyKey)) return byKey.get(message.idempotencyKey);
      const reply = { status: 'charged', chargeId: `ch_${charges.length + 1}` };
      charges.push({ orderId: message.orderId, amount: message.amount, chargeId: reply.chargeId });
      if (message.idempotencyKey) byKey.set(message.idempotencyKey, reply);
      return reply;
    },
  };
}
