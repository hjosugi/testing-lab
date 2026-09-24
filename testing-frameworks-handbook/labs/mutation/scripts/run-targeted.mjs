#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { runCatalog, validateCatalog } from '../src/targeted.mjs';
import { handbookRoot, labRoot, readJson } from '../src/load.mjs';

const catalogPath = resolve(process.argv[2] ?? '');
const catalog = readJson(catalogPath);
const errors = validateCatalog(catalog, handbookRoot);
if (errors.length > 0) {
  for (const error of errors) console.error(`CATALOG ${error}`);
  process.exit(1);
}
const results = runCatalog(catalog, handbookRoot, { log: line => console.log(line) });
const outDir = join(labRoot, 'build');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${basename(catalogPath, '.json')}-results.json`), `${JSON.stringify({ lane: catalog.lane, results }, null, 2)}\n`);
const survivors = results.filter(result => result.status !== 'KILLED');
console.log(`${catalog.lane}: ${results.length - survivors.length}/${results.length} killed`);
if (survivors.length > 0) {
  console.error(`${catalog.lane}: survivors need a test or a decision in decisions.json: ${survivors.map(result => result.id).join(', ')}`);
  process.exit(1);
}
