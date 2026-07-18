import { probe } from '../probe.js';

describe('Mocha same-file serial scheduling', () => {
  it('first', () => probe('first'));
  it('second', () => probe('second'));
});
