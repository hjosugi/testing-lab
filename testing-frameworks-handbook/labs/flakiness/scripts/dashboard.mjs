#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateHistory } from '../src/history.mjs';
import { renderDashboard } from '../src/dashboard.mjs';
import { syntheticCommits } from '../src/commits.mjs';
import { dependencySelect, evaluateSelection, importGraph, predictiveSelect } from '../src/selection.mjs';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quarantine = JSON.parse(readFileSync(join(labRoot, 'quarantine.json'), 'utf8'));
const playwrightPath = resolve(labRoot, '../system/test-results/flake-metrics.json');
const graph = importGraph(join(labRoot, 'fixture-project'));
const commits = syntheticCommits(graph);
const selection = [
  { name: 'dependency', ...evaluateSelection(commits, commit => dependencySelect(graph, commit.changed).tests) },
  { name: 'predictive (top-1, full run every 5)', ...evaluateSelection(commits, (commit, past) => predictiveSelect(past, commit.changed, 1)) },
];
const markdown = renderDashboard({
  attempts: generateHistory(),
  quarantine,
  runDate: runId => Date.UTC(2026, 7, 1) + runId * 86_400_000,
  selection,
  playwright: existsSync(playwrightPath) ? JSON.parse(readFileSync(playwrightPath, 'utf8')) : null,
});
mkdirSync(join(labRoot, 'build'), { recursive: true });
writeFileSync(join(labRoot, 'build', 'flake-dashboard.md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
process.stdout.write(markdown);
