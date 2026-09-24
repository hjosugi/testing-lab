// Test pool: each test calls the subject and asserts. Assertion counts vary
// on purpose (some tests only check the type), as in real suites.
const t = (id, input, checks) => ({ id, input, assertions: checks.length, checks });
const equals = value => fee => fee === value;
const isNumber = fee => typeof fee === 'number';
const throws = 'throws';

export const POOL = Object.freeze([
  t('std-light', { subtotal: 1000, weightKg: 1, express: false, member: false, region: 'main' }, [equals(600)]),
  t('std-light-type', { subtotal: 1000, weightKg: 1, express: false, member: false, region: 'main' }, [isNumber]),
  t('remote-light', { subtotal: 1000, weightKg: 2, express: false, member: false, region: 'remote' }, [equals(1200)]),
  t('remote-type', { subtotal: 900, weightKg: 2, express: false, member: false, region: 'remote' }, [isNumber]),
  t('heavy-11', { subtotal: 1000, weightKg: 11, express: false, member: false, region: 'main' }, [equals(900)]),
  t('heavy-10', { subtotal: 1000, weightKg: 10, express: false, member: false, region: 'main' }, [equals(600)]),
  t('heavy-16', { subtotal: 1000, weightKg: 16, express: false, member: false, region: 'main' }, [equals(1200)]),
  t('heavy-type', { subtotal: 1000, weightKg: 25, express: false, member: false, region: 'main' }, [isNumber]),
  t('express', { subtotal: 1000, weightKg: 1, express: true, member: false, region: 'main' }, [equals(1200)]),
  t('express-remote', { subtotal: 1000, weightKg: 1, express: true, member: false, region: 'remote' }, [equals(2400)]),
  t('express-type', { subtotal: 1000, weightKg: 3, express: true, member: false, region: 'main' }, [isNumber]),
  t('member-5000', { subtotal: 5000, weightKg: 1, express: false, member: true, region: 'main' }, [equals(0)]),
  t('member-4999', { subtotal: 4999, weightKg: 1, express: false, member: true, region: 'main' }, [equals(600)]),
  t('member-type', { subtotal: 7000, weightKg: 1, express: false, member: true, region: 'main' }, [isNumber]),
  t('nonmember-5000', { subtotal: 5000, weightKg: 1, express: false, member: false, region: 'main' }, [equals(600)]),
  t('half-10000', { subtotal: 10000, weightKg: 1, express: false, member: false, region: 'main' }, [equals(300)]),
  t('half-9999', { subtotal: 9999, weightKg: 1, express: false, member: false, region: 'main' }, [equals(600)]),
  t('half-odd', { subtotal: 20000, weightKg: 11, express: true, member: false, region: 'main' }, [equals(900)]),
  t('half-type', { subtotal: 15000, weightKg: 1, express: false, member: false, region: 'main' }, [isNumber]),
  t('negative-subtotal', { subtotal: -1, weightKg: 1, express: false, member: false, region: 'main' }, [throws]),
  t('zero-weight', { subtotal: 100, weightKg: 0, express: false, member: false, region: 'main' }, [throws]),
  t('zero-subtotal', { subtotal: 0, weightKg: 1, express: false, member: false, region: 'main' }, [equals(600)]),
  t('combo', { subtotal: 12000, weightKg: 21, express: true, member: false, region: 'remote' }, [equals(2100), isNumber]),
  t('combo-member', { subtotal: 12000, weightKg: 21, express: true, member: true, region: 'remote' }, [equals(0), isNumber]),
]);

export function runTest(test, shippingFee, hit) {
  let fee;
  try {
    fee = shippingFee(test.input, hit);
  } catch (error) {
    return test.checks.includes(throws) && error instanceof RangeError;
  }
  return test.checks.every(check => check !== throws && check(fee));
}
