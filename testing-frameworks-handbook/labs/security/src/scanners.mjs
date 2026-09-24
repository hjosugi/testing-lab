// Dependency-free scanners for the security portfolio. They are deliberately
// small and explainable; production pipelines would run gitleaks/semgrep/
// zizmor/trivy with the same finding-ledger contract (see README).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SECRET_RULES = Object.freeze([
  { id: 'aws-access-key', pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'private-key', pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { id: 'assigned-secret', pattern: /\b(password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i },
]);

// Card-network test numbers that may appear in fixtures (documented by the
// networks/PSPs as non-real). Any other Luhn-valid PAN is treated as real.
export const TEST_PANS = Object.freeze(new Set(['4111111111111111', '4242424242424242', '5555555555554444', '378282246310005']));

export function luhnValid(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

const PLACEHOLDER = /test|fake|dummy|example|sample|placeholder|pact|changeme/i;

export function scanText(path, text) {
  const findings = [];
  text.split('\n').forEach((line, index) => {
    if (line.includes('test-only-')) return;
    for (const rule of SECRET_RULES) {
      const match = line.match(rule.pattern);
      if (!match) continue;
      // Like gitleaks stopwords: an assigned value that says it is a
      // placeholder is synthetic fixture data, not a leaked credential.
      if (rule.id === 'assigned-secret' && PLACEHOLDER.test(match[0].split(/[:=]/).slice(1).join('='))) continue;
      findings.push({ path, line: index + 1, rule: rule.id });
    }
    for (const match of line.matchAll(/\b\d{13,19}\b/g)) {
      if (luhnValid(match[0]) && !TEST_PANS.has(match[0])) findings.push({ path, line: index + 1, rule: 'real-pan' });
    }
  });
  return findings;
}

export function scanFiles(paths) {
  return paths.flatMap(path => scanText(path, readFileSync(path, 'utf8')));
}

// Workflow (CI-as-IaC) policy: pinned actions, explicit least-privilege
// permissions, no pull_request_target, no untrusted context interpolated into
// shell, no persisted write tokens.
export function scanWorkflow(path, text) {
  const findings = [];
  const lines = text.split('\n');
  if (!/^permissions:/m.test(text)) findings.push({ path, line: 1, rule: 'workflow-permissions-missing' });
  if (/permissions:\s*write-all/.test(text)) findings.push({ path, line: 1, rule: 'workflow-write-all' });
  if (/^\s*pull_request_target:/m.test(text)) findings.push({ path, line: 1, rule: 'workflow-pull-request-target' });
  let inRun = false;
  let runIndent = 0;
  lines.forEach((line, index) => {
    const uses = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
    if (uses && !uses[1].startsWith('./') && !/@[0-9a-f]{40}$/.test(uses[1])) {
      findings.push({ path, line: index + 1, rule: 'action-not-pinned-to-sha', detail: uses[1] });
    }
    const run = line.match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (run) {
      inRun = true;
      runIndent = run[1].length;
      if (/\$\{\{\s*github\.event\.(issue|pull_request|comment|head_commit|review)/.test(run[2])) findings.push({ path, line: index + 1, rule: 'untrusted-context-in-run' });
      return;
    }
    if (inRun) {
      const indent = line.match(/^(\s*)/)[1].length;
      if (line.trim() !== '' && indent <= runIndent) inRun = false;
      else if (/\$\{\{\s*github\.event\.(issue|pull_request|comment|head_commit|review)/.test(line)) findings.push({ path, line: index + 1, rule: 'untrusted-context-in-run' });
    }
  });
  return findings;
}

// SAST-lite for the labs' JavaScript: sinks that turn data into code or SQL.
export const SAST_RULES = Object.freeze([
  { id: 'eval', pattern: /\beval\s*\(|new Function\s*\(/ },
  { id: 'child-process-shell-string', pattern: /(?<![\w.])exec(Sync)?\s*\(\s*`|\b(child_process|cp)\.exec(Sync)?\s*\(\s*`/ },
  { id: 'sql-template-literal', pattern: /\.(prepare|exec|query)\s*\(\s*`[^`]*\$\{/ },
]);

export function sastText(path, text, { allow = [] } = {}) {
  const findings = [];
  text.split('\n').forEach((line, index) => {
    for (const rule of SAST_RULES) {
      if (rule.pattern.test(line) && !allow.some(entry => entry.path === path && entry.rule === rule.id)) {
        findings.push({ path, line: index + 1, rule: rule.id });
      }
    }
  });
  return findings;
}

const SKIP_DIRS = new Set(['node_modules', 'build', '.venv', 'vendor', 'target', 'reports', 'obj', 'bin', '.gradle', 'test-results', 'playwright-report', '.pact-artifacts', '.stryker-tmp', 'storybook-static', '.pytest_cache', '.hypothesis', '__pycache__']);

export function walk(root, keep = () => true) {
  const out = [];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) visit(join(dir, entry.name));
      } else if (entry.isFile() && keep(entry.name)) {
        out.push(join(dir, entry.name));
      }
    }
  };
  visit(root);
  return out.sort();
}
