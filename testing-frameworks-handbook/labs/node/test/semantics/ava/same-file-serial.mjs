import test from 'ava';
import { probe } from '../probe.js';

test.serial('first', async t => {
  await probe('first');
  t.pass();
});

test.serial('second', async t => {
  await probe('second');
  t.pass();
});
