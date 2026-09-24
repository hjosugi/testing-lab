// Deterministic simulation kernel. Every source of nondeterminism the payment
// client touches goes through a seam owned by the simulator:
//   clock     -> sim.now()               (virtual milliseconds)
//   scheduler -> sim.sleep()/sim.spawn() (single event queue, seeded tie-break)
//   random    -> sim.random()            (mulberry32 from the seed)
//   network   -> sim.network.call()      (delay, drop, duplicate, reorder by fault plan)
//   disk      -> sim.disk                (fsync failure, torn write by fault plan)
// A run is a pure function of (seed, fault plan, workload), so any failing
// seed replays the identical event trace.
import { createHash } from 'node:crypto';

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

export class Simulation {
  #queue = [];
  #sequence = 0;
  #now = 0;
  #trace = [];

  constructor({ seed, faults = {} }) {
    this.seed = seed;
    this.random = mulberry32(seed);
    this.faults = { dropRate: 0, duplicateRate: 0, minDelayMs: 1, maxDelayMs: 20, fsyncFailureRate: 0, tornWriteRate: 0, ...faults };
    this.network = new SimNetwork(this);
    this.disk = new SimDisk(this);
  }

  now() { return this.#now; }

  record(event, detail = {}) {
    this.#trace.push({ at: this.#now, event, ...detail });
  }

  get trace() { return this.#trace; }

  traceHash() {
    return createHash('sha256').update(JSON.stringify(this.#trace)).digest('hex').slice(0, 16);
  }

  schedule(delayMs, callback) {
    // Ties at the same virtual time are broken by a seeded key, so the
    // scheduler explores different interleavings per seed but repeats them.
    this.#queue.push({ at: this.#now + delayMs, tie: this.random(), sequence: this.#sequence += 1, callback });
  }

  sleep(ms) {
    return new Promise(resolve => this.schedule(ms, resolve));
  }

  spawn(name, task) {
    const result = { name, done: false, value: undefined, error: undefined };
    this.schedule(0, () => {
      Promise.resolve().then(task).then(
        value => { result.done = true; result.value = value; },
        error => { result.done = true; result.error = error; },
      );
    });
    return result;
  }

  async run({ untilMs = 60_000, maxEvents = 100_000 } = {}) {
    let events = 0;
    while (this.#queue.length > 0) {
      this.#queue.sort((a, b) => a.at - b.at || a.tie - b.tie || a.sequence - b.sequence);
      const next = this.#queue.shift();
      if (next.at > untilMs) break;
      this.#now = next.at;
      next.callback();
      // Drain every promise continuation before advancing virtual time.
      await new Promise(resolve => setImmediate(resolve));
      events += 1;
      if (events > maxEvents) throw new Error(`simulation exceeded ${maxEvents} events (livelock?)`);
    }
  }
}

class SimNetwork {
  #handlers = new Map();

  constructor(sim) { this.sim = sim; }

  listen(address, handler) { this.#handlers.set(address, handler); }

  delay() {
    const { minDelayMs, maxDelayMs } = this.sim.faults;
    return minDelayMs + Math.floor(this.sim.random() * (maxDelayMs - minDelayMs + 1));
  }

  // Request/response RPC with independent faults on each direction. A dropped
  // request or response surfaces to the caller only as a timeout, which is
  // exactly the ambiguity retries and idempotency keys have to handle.
  call(address, message, { timeoutMs }) {
    const sim = this.sim;
    return new Promise((resolve, reject) => {
      let settled = false;
      sim.schedule(timeoutMs, () => {
        if (!settled) { settled = true; sim.record('timeout', { address, id: message.id }); reject(new Error('timeout')); }
      });
      const deliver = () => {
        const handler = this.#handlers.get(address);
        const reply = handler(message);
        if (sim.random() < sim.faults.dropRate) { sim.record('drop-response', { id: message.id }); return; }
        sim.schedule(this.delay(), () => {
          if (!settled) { settled = true; resolve(reply); }
        });
      };
      if (sim.random() < sim.faults.dropRate) { sim.record('drop-request', { id: message.id }); return; }
      sim.schedule(this.delay(), deliver);
      if (sim.random() < sim.faults.duplicateRate) {
        sim.record('duplicate-request', { id: message.id });
        sim.schedule(this.delay(), () => this.#handlers.get(address)(message));
      }
    });
  }
}

class SimDisk {
  #durable = new Map();
  #pending = new Map();

  constructor(sim) { this.sim = sim; }

  write(key, value) { this.#pending.set(key, value); }

  fsync() {
    if (this.sim.random() < this.sim.faults.fsyncFailureRate) {
      this.sim.record('fsync-failed');
      throw new Error('EIO: fsync failed');
    }
    for (const [key, value] of this.#pending) {
      if (this.sim.random() < this.sim.faults.tornWriteRate) {
        this.sim.record('torn-write', { key });
        this.#durable.set(key, { torn: true, prefix: JSON.stringify(value).slice(0, 5) });
      } else {
        this.#durable.set(key, value);
      }
    }
    this.#pending.clear();
  }

  crash() { this.#pending.clear(); this.sim.record('crash'); }

  read(key) { return this.#durable.get(key); }
}
