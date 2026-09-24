// Change-based test selection. Dependency selection walks static imports and
// falls back to "run everything" for files it cannot map; predictive
// selection ranks tests by history and is only safe with periodic full runs
// and a measured miss rate.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, normalize, relative } from 'node:path';

export function importGraph(root) {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.mjs')) files.push(path);
    }
  };
  walk(root);
  const graph = new Map();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/(?:import|export)[^'"]*from\s+['"](\.[^'"]+)['"]/g)]
      .map(match => relative(root, normalize(join(dirname(file), match[1]))));
    graph.set(relative(root, file), imports);
  }
  return graph;
}

export function dependencySelect(graph, changedFiles) {
  const tests = [...graph.keys()].filter(file => file.startsWith('test/'));
  const unknown = changedFiles.filter(file => !graph.has(file));
  if (unknown.length > 0) return { tests: tests.sort(), fallback: `unmapped change(s) ${unknown.join(', ')}: run everything` };
  const reaches = (file, target, seen = new Set()) => {
    if (file === target) return true;
    if (seen.has(file)) return false;
    seen.add(file);
    return (graph.get(file) ?? []).some(next => reaches(next, target, seen));
  };
  return { tests: tests.filter(test => changedFiles.some(changed => reaches(test, changed))).sort(), fallback: null };
}

// Predictive: pick the `budget` tests that failed most often historically
// when the same files changed.
export function predictiveSelect(history, changedFiles, budget) {
  const score = new Map();
  for (const commit of history) {
    if (!commit.changed.some(file => changedFiles.includes(file))) continue;
    for (const test of commit.failing) score.set(test, (score.get(test) ?? 0) + 1);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, budget).map(([test]) => test);
}

// Replays commits: a selection "misses" when a truly failing test was not
// selected. A full run every `fullEvery` commits bounds detection delay.
export function evaluateSelection(commits, select, { fullEvery = 5 } = {}) {
  let misses = 0;
  let failingCommits = 0;
  let selected = 0;
  const pending = [];
  const delays = [];
  commits.forEach((commit, index) => {
    const full = (index + 1) % fullEvery === 0;
    const chosen = full ? commit.allTests : select(commit, commits.slice(0, index));
    selected += chosen.length;
    if (commit.failing.length > 0) failingCommits += 1;
    const missed = commit.failing.filter(test => !chosen.includes(test));
    if (missed.length > 0 && !full) { misses += 1; pending.push({ index, missed }); }
    if (full) for (const item of pending.splice(0)) delays.push(index - item.index);
  });
  return { commits: commits.length, failingCommits, misses, missRate: failingCommits === 0 ? 0 : misses / failingCommits, meanSelected: selected / commits.length, maxDetectionDelay: Math.max(0, ...delays), undetected: pending.length };
}
