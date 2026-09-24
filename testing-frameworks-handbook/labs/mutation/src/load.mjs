import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const handbookRoot = resolve(labRoot, '../..');
export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export const loadRiskMap = () => readJson(join(labRoot, 'risk-map.json'));
export const loadLedger = () => readJson(join(labRoot, 'decisions.json'));
export const todayUtc = () => new Date().toISOString().slice(0, 10);
