// Catalog-driven source mutation for languages whose mutation tools were not
// adopted (see SPIKE.md). Each mutant is a single, reviewed text replacement in
// high-risk code; the lab's own test command is the oracle.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const digest = content => createHash('sha256').update(content).digest('hex');

export function validateCatalog(catalog, handbookRoot) {
  const errors = [];
  const ids = new Set();
  for (const field of ['lane', 'cwd']) {
    if (typeof catalog[field] !== 'string') errors.push(`catalog ${field} is required`);
  }
  if (!Array.isArray(catalog.command) || catalog.command.length === 0) errors.push('catalog command is required');
  for (const mutant of catalog.mutants ?? []) {
    const where = `${catalog.lane}/${mutant.id}`;
    if (ids.has(mutant.id)) errors.push(`${where}: duplicate id`);
    ids.add(mutant.id);
    for (const field of ['file', 'original', 'replacement', 'risk', 'protects']) {
      if (typeof mutant[field] !== 'string' || mutant[field] === '') errors.push(`${where}: ${field} is required`);
    }
    if (mutant.original === mutant.replacement) errors.push(`${where}: replacement must differ`);
    const path = join(handbookRoot, catalog.cwd ?? '', mutant.file ?? '');
    if (!existsSync(path)) {
      errors.push(`${where}: ${path} does not exist`);
      continue;
    }
    const occurrences = readFileSync(path, 'utf8').split(mutant.original).length - 1;
    if (occurrences !== 1) errors.push(`${where}: original text must occur exactly once, found ${occurrences}`);
  }
  if ((catalog.mutants ?? []).length === 0) errors.push(`${catalog.lane}: at least one mutant is required`);
  return errors;
}

// A crash between apply and restore must not leave production code mutated:
// the pristine copy is written next to the file first and restored on the next
// run (and CI rejects any leftover working-tree drift).
export function recoverInterrupted(path) {
  const backup = `${path}.mutation-backup`;
  if (existsSync(backup)) {
    renameSync(backup, path);
    return true;
  }
  return false;
}

export function withMutant(path, mutant, action) {
  recoverInterrupted(path);
  const pristine = readFileSync(path, 'utf8');
  const occurrences = pristine.split(mutant.original).length - 1;
  if (occurrences !== 1) throw new Error(`${mutant.id}: expected one target in ${path}, found ${occurrences}`);
  const backup = `${path}.mutation-backup`;
  writeFileSync(backup, pristine);
  try {
    writeFileSync(path, pristine.replace(mutant.original, mutant.replacement));
    return action();
  } finally {
    writeFileSync(path, pristine);
    rmSync(backup, { force: true });
    if (digest(readFileSync(path, 'utf8')) !== digest(pristine)) {
      throw new Error(`${path} was not restored after ${mutant.id}`);
    }
  }
}

export function runCatalog(catalog, handbookRoot, { spawn = spawnSync, log = () => {} } = {}) {
  const cwd = join(handbookRoot, catalog.cwd);
  const [command, ...args] = catalog.command;
  const run = () => spawn(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...catalog.env }, timeout: (catalog.timeoutSeconds ?? 600) * 1000 });

  for (const step of catalog.setup ?? []) {
    const [setupCommand, ...setupArgs] = step;
    const result = spawn(setupCommand, setupArgs, { cwd, encoding: 'utf8', env: { ...process.env, ...catalog.env } });
    if (result.status !== 0) throw new Error(`setup failed: ${step.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }

  const baseline = run();
  if (baseline.status !== 0) {
    throw new Error(`baseline must pass before mutating:\n${baseline.stdout ?? ''}${baseline.stderr ?? ''}`);
  }

  const results = [];
  for (const mutant of catalog.mutants) {
    const started = Date.now();
    const result = withMutant(join(cwd, mutant.file), mutant, run);
    const status = result.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : result.status === 0 ? 'SURVIVED' : 'KILLED';
    const outcome = { id: mutant.id, risk: mutant.risk, protects: mutant.protects, status, seconds: Math.round((Date.now() - started) / 100) / 10 };
    log(`${status.padEnd(8)} ${mutant.id} ${mutant.protects} (${outcome.seconds}s)`);
    results.push(outcome);
  }
  return results;
}
