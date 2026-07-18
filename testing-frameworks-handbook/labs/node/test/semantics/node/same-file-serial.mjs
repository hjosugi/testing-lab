import { describe, test } from 'node:test';
import { probe } from '../probe.js';

describe('node:test same-file serial scheduling', () => {
  test('first', () => probe('first'));
  test('second', () => probe('second'));
});
