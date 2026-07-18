import { test } from 'node:test';
import { probe } from '../probe.js';

test('node:test isolated file A', () => probe('file-a'));
