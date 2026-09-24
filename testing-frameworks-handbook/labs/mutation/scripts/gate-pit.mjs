#!/usr/bin/env node
// Reads PIT's mutations.xml without extra dependencies and applies the same
// decision ledger as the Stryker gate.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gateSurvivors, validateLedger } from '../src/policy.mjs';
import { loadLedger, loadRiskMap, todayUtc } from '../src/load.mjs';

export function pitMutants(xml) {
  const text = tag => block => block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '';
  return [...xml.matchAll(/<mutation\b([^>]*)>([\s\S]*?)<\/mutation>/g)].map(([, attributes, body]) => ({
    status: attributes.match(/status='([^']+)'/)?.[1] ?? attributes.match(/status="([^"]+)"/)?.[1],
    file: `${text('mutatedClass')(body)}#${text('mutatedMethod')(body)}`,
    line: Number(text('lineNumber')(body)),
    mutator: text('mutator')(body).split('.').at(-1),
    original: text('mutatedClass')(body),
    replacement: text('description')(body),
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mutants = pitMutants(readFileSync(resolve(process.argv[2] ?? 'build/reports/pitest/mutations.xml'), 'utf8'));
  if (mutants.length === 0) {
    console.error('pit gate: no mutants found; refusing an empty report');
    process.exit(1);
  }
  const ledger = loadLedger();
  const ledgerErrors = validateLedger(ledger, loadRiskMap(), todayUtc());
  const survivors = mutants.filter(mutant => ['SURVIVED', 'NO_COVERAGE'].includes(mutant.status));
  const gate = gateSurvivors({ survivors, decisions: ledger.decisions, lane: 'java-pit' });
  console.log(`pit gate: ${mutants.length - survivors.length}/${mutants.length} detected, ${gate.decided.length} decided, ${gate.undecided.length} undecided`);
  for (const survivor of gate.undecided) console.error(`UNDECIDED ${survivor.status} ${survivor.file}:${survivor.line} ${survivor.mutator} ${survivor.replacement}`);
  for (const id of gate.stale) console.error(`STALE decision ${id} matches no survivor; delete it`);
  for (const error of ledgerErrors) console.error(`LEDGER ${error}`);
  if (!gate.passed || ledgerErrors.length > 0) process.exit(1);
}
