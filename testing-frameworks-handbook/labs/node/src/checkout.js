export class PaymentError extends Error {}

export class CartItem {
  constructor(sku, quantity, unitPrice) {
    this.sku = sku;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  subtotal() {
    if (this.quantity <= 0 || this.unitPrice < 0) {
      throw new RangeError('quantity must be positive and price non-negative');
    }
    return this.quantity * this.unitPrice;
  }
}

export class CheckoutService {
  constructor({ payments, orders }) {
    this.payments = payments;
    this.orders = orders;
  }

  async checkout({ orderId, items, token }) {
    if (items.length === 0) throw new RangeError('cart must not be empty');
    const total = items.reduce((sum, item) => sum + item.subtotal(), 0);
    const paymentId = await this.payments.capture(total, token);
    const order = { orderId, total, status: 'CONFIRMED', paymentId };
    await this.orders.save(order);
    return order;
  }
}

