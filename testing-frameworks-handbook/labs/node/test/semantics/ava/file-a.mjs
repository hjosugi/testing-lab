import test from 'ava';
import { probe } from '../probe.js';

test('AVA isolated file A', async t => {
  await probe('file-a');
  t.pass();
});
