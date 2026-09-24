#!/usr/bin/env node
// SCA triage: runs `npm audit --json` per npm lab and reconciles advisories
// with findings.json. Critical/high advisories need a ledger entry (owner,
// impact, SLA or suppression expiry); moderate/low are reported only.
// Runs in the scheduled security workflow because advisory data changes
// independently of commits.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcile, validateLedger } from '../src/ledger.mjs';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const handbookRoot = resolve(labRoot, '../..');
const ledger = JSON.parse(readFileSync(join(labRoot, 'findings.json'), 'utf8'));
const projects = ['labs/node', 'labs/advanced', 'labs/system'];
const findings = [];
const rows = [];

for (const project of projects) {
  const audit = spawnSync('npm', ['audit', '--json'], { cwd: join(handbookRoot, project), encoding: 'utf8' });
  const report = JSON.parse(audit.stdout || '{}');
  if (!report.vulnerabilities) throw new Error(`${project}: npm audit returned no report\n${audit.stderr}`);
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    const advisories = vulnerability.via.filter(via => typeof via === 'object');
    for (const advisory of advisories) {
      const id = advisory.url?.split('/').pop() ?? String(advisory.source);
      rows.push(`| ${project} | ${name} | ${advisory.severity} | ${id} | ${vulnerability.isDirect ? 'direct' : 'transitive'} | ${advisory.title} |`);
      if (['critical', 'high'].includes(advisory.severity)) findings.push({ source: 'sca', rule: id, path: `${project}:${name}`, severity: advisory.severity });
    }
  }
}

const unique = [...new Map(findings.map(finding => [`${finding.rule}:${finding.path}`, finding])).values()];
const errors = validateLedger(ledger, new Date().toISOString().slice(0, 10));
const scaLedger = { findings: ledger.findings.filter(entry => entry.source === 'sca') };
const { untriaged, resolved } = reconcile(unique, scaLedger);
console.log(['## SCA triage (npm audit)', '', '| Project | Package | Severity | Advisory | Path | Title |', '|---|---|---|---|---|---|', ...rows, '',
  `critical/high needing a decision: ${unique.length}; untriaged: ${untriaged.length}; ledger entries now resolved: ${resolved.length}`].join('\n'));
for (const finding of untriaged) console.error(`UNTRIAGED ${finding.severity} ${finding.rule} ${finding.path}: add an owner, impact, and SLA or suppression to findings.json`);
for (const key of resolved) console.error(`RESOLVED ${key}: remove it from findings.json`);
for (const error of errors) console.error(`LEDGER ${error}`);
if (untriaged.length > 0 || resolved.length > 0 || errors.length > 0) process.exit(1);
