import test from 'ava';
import { CartItem, CheckoutService } from '../../src/checkout.js';
import { FakePayments, InMemoryOrders } from '../helpers/fakes.js';

test('AVA isolates a state-based checkout test', async t => {
  const payments = new FakePayments();
  const orders = new InMemoryOrders();
  const service = new CheckoutService({ payments, orders });

  const result = await service.checkout({
    orderId: 'o-1', items: [new CartItem('book', 2, 600)], token: 't-1'
  });

  t.is(result.total, 1200);
  t.deepEqual(orders.byId.get('o-1'), result);
});

