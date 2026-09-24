#!/usr/bin/env node
// Usage:
//   mutation-lanes.mjs plan --base <git-ref> [--budget <seconds>]   PR lane: changed files only
//   mutation-lanes.mjs plan --files a,b                             explicit file list
//   mutation-lanes.mjs plan --full                                  scheduled full lane
//   add --run to execute the selected lanes; add --summary <file> for a Markdown job summary.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fullPlan, planLanes, reviewActionRate, validateLedger } from '../src/policy.mjs';
import { handbookRoot, labRoot, loadLedger, loadRiskMap, todayUtc } from '../src/load.mjs';

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const riskMap = loadRiskMap();
const ledger = loadLedger();

function changedFiles() {
  const files = option('--files');
  if (files !== undefined) return files.split(',').filter(Boolean);
  const base = option('--base');
  if (!base) throw new Error('plan needs --base <ref>, --files <list>, or --full');
  const diff = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: handbookRoot, encoding: 'utf8' });
  if (diff.status !== 0) throw new Error(`git diff failed: ${diff.stderr}`);
  return diff.stdout.split('\n').filter(Boolean);
}

const ledgerErrors = validateLedger(ledger, riskMap, todayUtc());
if (ledgerErrors.length > 0) {
  for (const error of ledgerErrors) console.error(`LEDGER ${error}`);
  process.exit(1);
}

const plan = args.includes('--full')
  ? fullPlan(riskMap)
  : planLanes({ changedFiles: changedFiles(), riskMap, budgetSeconds: Number(option('--budget') ?? riskMap.prBudgetSeconds) });
const action = reviewActionRate(ledger.reviews);

const results = [];
if (args.includes('--run')) {
  for (const entry of plan.selected) {
    const lane = riskMap.lanes.find(candidate => candidate.id === entry.id);
    const [command, ...rest] = lane.command;
    const started = Date.now();
    console.log(`::group::mutation lane ${lane.id} (${lane.tool})`);
    const result = spawnSync(command, rest, { cwd: join(handbookRoot, lane.cwd), stdio: 'inherit' });
    console.log('::endgroup::');
    results.push({ id: lane.id, passed: result.status === 0, seconds: Math.round((Date.now() - started) / 1000) });
  }
}

const report = { mode: args.includes('--full') ? 'scheduled-full' : 'changed-files', plan, results, reviewActionRate: action };
mkdirSync(join(labRoot, 'build'), { recursive: true });
writeFileSync(join(labRoot, 'build', 'mutation-plan.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  `## Mutation lanes (${report.mode})`,
  '',
  `Budget: ${plan.budgetSeconds ?? 'none (scheduled)'}s, estimated: ${plan.estimatedSeconds}s`,
  '',
  '| Lane | Risk | Est. s | Result | Why |',
  '|---|---|---:|---|---|',
  ...plan.selected.map(entry => {
    const result = results.find(candidate => candidate.id === entry.id);
    const status = result ? `${result.passed ? 'PASS' : 'FAIL'} (${result.seconds}s)` : 'planned';
    return `| ${entry.id} | ${entry.risk} | ${entry.estimatedSeconds} | ${status} | ${entry.reasons.join('<br>')} |`;
  }),
  ...plan.deferred.map(entry => `| ${entry.id} | ${entry.risk} | ${entry.estimatedSeconds} | deferred: ${entry.deferral} | ${entry.reasons.join('<br>')} |`),
  '',
  plan.unmapped.length > 0 ? `Unmapped production files (no mutation lane; review the risk map): ${plan.unmapped.join(', ')}` : 'Unmapped production files: none',
  '',
  `Review action rate: ${action.actioned}/${action.reviewed} reviewed survivors led to a test or code change (${action.rate === null ? 'n/a' : `${Math.round(action.rate * 100)}%`}).`,
];
const markdown = `${lines.join('\n')}\n`;
process.stdout.write(markdown);
const summary = option('--summary');
if (summary) appendFileSync(summary, markdown);
if (results.some(result => !result.passed)) process.exit(1);
