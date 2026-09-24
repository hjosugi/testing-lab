#!/usr/bin/env node
// Fails when any Stryker survivor (Survived or NoCoverage) lacks a reviewed,
// unexpired decision, or when a decision no longer matches any survivor.
import { resolve } from 'node:path';
import { gateSurvivors, strykerSurvivors, validateLedger } from '../src/policy.mjs';
import { loadLedger, loadRiskMap, readJson, todayUtc } from '../src/load.mjs';

const reportPath = resolve(process.argv[2] ?? 'reports/mutation/mutation.json');
const ledger = loadLedger();
const ledgerErrors = validateLedger(ledger, loadRiskMap(), todayUtc());
const { total, detected, survivors } = strykerSurvivors(readJson(reportPath));
const gate = gateSurvivors({ survivors, decisions: ledger.decisions, lane: 'js-stryker' });

console.log(`stryker gate: ${detected}/${total} detected, ${gate.decided.length} decided survivor(s), ${gate.undecided.length} undecided`);
for (const survivor of gate.undecided) {
  console.error(`UNDECIDED ${survivor.status} ${survivor.file}:${survivor.line} ${survivor.mutator} ${JSON.stringify(survivor.original)} -> ${JSON.stringify(survivor.replacement)}`);
}
for (const id of gate.stale) console.error(`STALE decision ${id} matches no survivor; delete it`);
for (const error of ledgerErrors) console.error(`LEDGER ${error}`);
if (!gate.passed || ledgerErrors.length > 0) process.exit(1);
