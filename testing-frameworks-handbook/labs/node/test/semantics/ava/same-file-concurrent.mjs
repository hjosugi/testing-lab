import test from 'ava';
import { probe } from '../probe.js';

test('first', async t => {
  await probe('first');
  t.pass();
});

test('second', async t => {
  await probe('second');
  t.pass();
});
