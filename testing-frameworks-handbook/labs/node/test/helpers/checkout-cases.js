import { CartItem, CheckoutService } from '../../src/checkout.js';
import { FakePayments, InMemoryOrders } from './fakes.js';

export const checkoutCases = Object.freeze([
  {
    name: 'one item type',
    items: [['book', 2, 600]],
    expected: 1200
  },
  {
    name: 'two item types',
    items: [['a', 1, 100], ['b', 3, 50]],
    expected: 250
  }
]);

export async function executeCheckoutCase({ items, expected }) {
  const payments = new FakePayments();
  const orders = new InMemoryOrders();
  const service = new CheckoutService({ payments, orders });

  const result = await service.checkout({
    orderId: 'o-1',
    items: items.map(args => new CartItem(...args)),
    token: 't-1'
  });

  return { expected, orders, payments, result };
}
