export class FakePayments {
  constructor({ fail = false } = {}) {
    this.fail = fail;
    this.captured = [];
  }

  async capture(amount, token) {
    if (this.fail) throw new Error('declined');
    this.captured.push({ amount, token });
    return `pay-${this.captured.length}`;
  }
}

export class InMemoryOrders {
  constructor() {
    this.byId = new Map();
  }

  async save(order) {
    this.byId.set(order.orderId, structuredClone(order));
  }
}

