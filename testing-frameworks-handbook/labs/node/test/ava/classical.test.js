import test from 'ava';
import { checkoutCases, executeCheckoutCase } from '../helpers/checkout-cases.js';

for (const { name, ...checkoutCase } of checkoutCases) {
  test(`Classical checkout: ${name}`, async t => {
    const { expected, orders, payments, result } = await executeCheckoutCase(checkoutCase);

    t.is(result.total, expected);
    t.deepEqual(orders.byId.get('o-1'), result);
    t.deepEqual(payments.captured, [{ amount: expected, token: 't-1' }]);
  });
}
