// Command model for the order lifecycle (Issue #37), shared by the
// model-based test and the corpus recorder.
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { OrderLifecycle } from '../src/order-lifecycle.js';

export const AMOUNT = 1_000;
const TRANSITIONS = {
  reserve: ['NEW'], pay: ['RESERVED'], ship: ['PAID'], cancel: ['NEW', 'RESERVED', 'PAID'], refund: ['PAID', 'SHIPPED'],
};

const expectRejected = (real, model, action) => {
  const before = { state: real.state, paid: real.paid, refunded: real.refunded };
  assert.throws(action);
  assert.deepEqual({ state: real.state, paid: real.paid, refunded: real.refunded }, before, 'rejected command changes nothing');
  assert.equal(real.state, model.state);
};

export class Reserve {
  check() { return true; }
  run(model, real) {
    if (!TRANSITIONS.reserve.includes(model.state)) return expectRejected(real, model, () => real.reserve());
    real.reserve();
    model.state = 'RESERVED';
    assert.equal(real.state, model.state);
  }
  toString() { return 'reserve'; }
}

export class Pay {
  constructor(key) { this.key = key; }
  check() { return true; }
  run(model, real) {
    if (model.receipts.has(this.key)) {
      assert.equal(real.pay(this.key), model.receipts.get(this.key), 'duplicate/retried payment is idempotent');
      assert.equal(real.paid, model.paid, 'no second charge');
      return;
    }
    if (!TRANSITIONS.pay.includes(model.state)) return expectRejected(real, model, () => real.pay(this.key));
    const receipt = real.pay(this.key);
    model.receipts.set(this.key, receipt);
    model.paid = AMOUNT;
    model.state = 'PAID';
    assert.equal(real.state, 'PAID');
  }
  toString() { return `pay(${this.key})`; }
}

export class Ship {
  check() { return true; }
  run(model, real) {
    if (!TRANSITIONS.ship.includes(model.state)) return expectRejected(real, model, () => real.ship());
    real.ship();
    model.state = 'SHIPPED';
  }
  toString() { return 'ship'; }
}

export class Cancel {
  check() { return true; }
  run(model, real) {
    if (!TRANSITIONS.cancel.includes(model.state)) return expectRejected(real, model, () => real.cancel());
    if (model.state === 'PAID') model.refunded = model.paid;
    real.cancel();
    model.state = 'CANCELLED';
    assert.equal(real.refunded, model.refunded);
  }
  toString() { return 'cancel'; }
}

export class Refund {
  constructor(amount) { this.amount = amount; }
  check() { return true; }
  run(model, real) {
    if (!TRANSITIONS.refund.includes(model.state) || this.amount > model.paid - model.refunded) {
      return expectRejected(real, model, () => real.refund(this.amount));
    }
    real.refund(this.amount);
    model.refunded += this.amount;
    assert.equal(real.refunded, model.refunded);
    assert.ok(real.refunded <= real.paid, 'never refund more than was paid');
  }
  toString() { return `refund(${this.amount})`; }
}

const commands = fc.commands([
  fc.constant(new Reserve()),
  fc.constantFrom('k1', 'k2').map(key => new Pay(key)),
  fc.constant(new Ship()),
  fc.constant(new Cancel()),
  fc.integer({ min: 1, max: 1_200 }).map(amount => new Refund(amount)),
], { maxCommands: 12 });

export const lifecycleProperty = defect => fc.property(commands, cmds => {
  fc.modelRun(() => ({ model: { state: 'NEW', paid: 0, refunded: 0, receipts: new Map() }, real: new OrderLifecycle({ amount: AMOUNT, defect }) }), cmds);
});


// Rebuild a saved command sequence (e.g. from the regression corpus).
export function parseCommands(names) {
  return names.map(name => {
    const [, op, arg] = /^(\w+)(?:\(([^)]*)\))?$/.exec(name);
    if (op === 'reserve') return new Reserve();
    if (op === 'pay') return new Pay(arg);
    if (op === 'ship') return new Ship();
    if (op === 'cancel') return new Cancel();
    if (op === 'refund') return new Refund(Number(arg));
    throw new Error(`unknown command ${name}`);
  });
}

export function runSequence(names, defect) {
  fc.modelRun(() => ({ model: { state: 'NEW', paid: 0, refunded: 0, receipts: new Map() }, real: new OrderLifecycle({ amount: AMOUNT, defect }) }), parseCommands(names));
}
