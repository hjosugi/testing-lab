#!/usr/bin/env node
// Regenerates matrix.json from model.json. `--check` fails if the committed
// matrix is stale (the matrix is reproducible from model + seed).
import { readFileSync, writeFileSync } from 'node:fs';
import { buildMatrix } from '../src/pairwise.mjs';

const model = JSON.parse(readFileSync(new URL('../model.json', import.meta.url), 'utf8'));
const matrix = `${JSON.stringify(buildMatrix(model), null, 2)}\n`;
const target = new URL('../matrix.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== matrix) {
    console.error('matrix.json is stale: run node scripts/generate.mjs');
    process.exit(1);
  }
  console.log('matrix.json matches model.json');
} else {
  writeFileSync(target, matrix);
  console.log(`wrote matrix.json (${JSON.parse(matrix).cases.length} cases)`);
}
