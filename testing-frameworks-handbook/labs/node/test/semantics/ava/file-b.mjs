import test from 'ava';
import { probe } from '../probe.js';

test('AVA isolated file B', async t => {
  await probe('file-b');
  t.pass();
});
