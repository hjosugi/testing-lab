// Order lifecycle for the model-based testing exercise (Issue #37).
//   NEW -> RESERVED -> PAID -> SHIPPED
//   NEW/RESERVED -> CANCELLED;  PAID -> CANCELLED (full refund)
//   PAID/SHIPPED -> partial refunds up to the paid amount
// `defect` switches in one seeded bug so the tests can show which technique
// finds it: 'refund-per-call-cap' checks each refund against the paid amount
// instead of the remaining refundable amount.
export class OrderLifecycle {
  #state = 'NEW';
  #paid = 0;
  #refunded = 0;
  #payments = new Map();

  constructor({ amount, defect = null }) {
    this.amount = amount;
    this.defect = defect;
  }

  get state() { return this.#state; }
  get paid() { return this.#paid; }
  get refunded() { return this.#refunded; }

  reserve() {
    if (this.#state !== 'NEW') throw new Error(`cannot reserve in ${this.#state}`);
    this.#state = 'RESERVED';
  }

  // Idempotent by key: a retried or duplicated payment returns the first result.
  pay(key) {
    if (this.#payments.has(key)) return this.#payments.get(key);
    if (this.#state !== 'RESERVED') throw new Error(`cannot pay in ${this.#state}`);
    const receipt = `rcpt-${this.#payments.size + 1}`;
    this.#payments.set(key, receipt);
    this.#paid = this.amount;
    this.#state = 'PAID';
    return receipt;
  }

  ship() {
    if (this.#state !== 'PAID') throw new Error(`cannot ship in ${this.#state}`);
    this.#state = 'SHIPPED';
  }

  cancel() {
    if (!['NEW', 'RESERVED', 'PAID'].includes(this.#state)) throw new Error(`cannot cancel in ${this.#state}`);
    if (this.#state === 'PAID') this.#refunded = this.#paid;
    this.#state = 'CANCELLED';
  }

  refund(amount) {
    if (!['PAID', 'SHIPPED'].includes(this.#state)) throw new Error(`cannot refund in ${this.#state}`);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new RangeError('refund must be a positive integer');
    const limit = this.defect === 'refund-per-call-cap' ? this.#paid : this.#paid - this.#refunded;
    if (amount > limit) throw new RangeError('refund exceeds the refundable amount');
    this.#refunded += amount;
  }
}
