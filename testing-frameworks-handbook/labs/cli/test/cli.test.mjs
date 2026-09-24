// Process-level contract tests for receipt-cli: exit codes, stdout/stderr
// separation, signals, permission and disk-full failures, atomic rename,
// awkward paths, and child timeout/cleanup. Every test owns a temp dir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../src/receipt-cli.mjs', import.meta.url));
const ORDER = JSON.stringify({ orderId: 'o-1', items: [{ sku: 'book', quantity: 2, unitPrice: 600 }, { sku: 'pen', quantity: 3, unitPrice: 120 }] });
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

function workspace(t) {
  const dir = mkdtempSync(join(tmpdir(), 'receipt-cli-'));
  t.after(() => { try { chmodSync(dir, 0o755); } catch {} rmSync(dir, { recursive: true, force: true }); });
  return dir;
}

// Runs the CLI with a deadline; on timeout the whole process group is
// killed so no grandchild survives the test.
function run(args, { input = ORDER, shellPrefix = null, timeoutMs = 5_000, onSpawn } = {}) {
  return new Promise(resolve => {
    const command = shellPrefix ? 'bash' : process.execPath;
    const argv = shellPrefix ? ['-c', `${shellPrefix}; exec "${process.execPath}" "${CLI}" ${args.map(arg => `'${arg}'`).join(' ')}`] : [CLI, ...args];
    const child = spawn(command, argv, { detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeoutMs);
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr, pid: child.pid }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    onSpawn?.(child);
  });
}

test('success: exit 0, stdout is one JSON line, stderr is empty, receipt is complete', async t => {
  const dir = workspace(t);
  const out = join(dir, 'receipt.txt');
  const result = await run(['--out', out]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { out, total: 1560, bytes: readFileSync(out).length });
  assert.equal(readFileSync(out, 'utf8'), 'ORDER o-1\nbook\tx2\t1200\npen\tx3\t360\nTOTAL 1560\n');
});

test('usage and data errors: distinct exit codes, message on stderr, nothing on stdout', async t => {
  const dir = workspace(t);
  const cases = [
    { args: [], input: ORDER, code: 2, message: /missing --out/ },
    { args: ['--out'], input: ORDER, code: 2, message: /unknown or incomplete argument/ },
    { args: ['--out', join(dir, 'a.txt')], input: '{not json', code: 65, message: /not valid JSON/ },
    { args: ['--out', join(dir, 'b.txt')], input: '{"orderId":"x","items":[]}', code: 65, message: /non-empty array/ },
    { args: ['--out', join(dir, 'c.txt'), '--input', join(dir, 'missing.json')], input: '', code: 66, message: /cannot read input/ },
  ];
  for (const expected of cases) {
    const result = await run(expected.args, { input: expected.input });
    assert.equal(result.code, expected.code, JSON.stringify(expected.args));
    assert.equal(result.stdout, '', 'stdout stays machine-readable');
    assert.match(result.stderr, expected.message);
  }
  assert.deepEqual(readdirSync(dir), [], 'failed runs leave no files');
});

test('permission denied: exit 73 and no temp file left', { skip: isRoot && 'root ignores directory permissions' }, async t => {
  const dir = workspace(t);
  chmodSync(dir, 0o500);
  const result = await run(['--out', join(dir, 'receipt.txt')]);
  assert.equal(result.code, 73);
  assert.match(result.stderr, /EACCES/);
  chmodSync(dir, 0o755);
  assert.deepEqual(readdirSync(dir), []);
});

test('disk full (file size limit): the partial write never replaces the target', { skip: platform() === 'win32' && 'ulimit is POSIX-only' }, async t => {
  const dir = workspace(t);
  const out = join(dir, 'receipt.txt');
  writeFileSync(out, 'previous receipt\n');
  const big = JSON.stringify({ orderId: 'big', items: Array.from({ length: 400 }, (_, i) => ({ sku: `sku-${i}`, quantity: 1, unitPrice: i })) });
  // `ulimit -f 1` caps files at one 512-byte block: writes beyond it fail
  // with EFBIG (SIGXFSZ ignored), the same shape as ENOSPC for the caller.
  const result = await run(['--out', out], { input: big, shellPrefix: 'trap "" XFSZ; ulimit -f 1' });
  assert.equal(result.code, 73, result.stderr);
  assert.match(result.stderr, /EFBIG|ENOSPC/);
  assert.equal(readFileSync(out, 'utf8'), 'previous receipt\n', 'old file intact: atomic rename never happened');
  assert.deepEqual(readdirSync(dir), ['receipt.txt'], 'temp file cleaned up');
});

test('signals: SIGTERM and SIGINT mid-write exit 143/130 and leave neither a partial target nor a temp file', async t => {
  for (const [signal, code] of [['SIGTERM', 143], ['SIGINT', 130]]) {
    const dir = workspace(t);
    const out = join(dir, 'receipt.txt');
    const result = await run(['--out', out, '--slow-ms', '2000'], {
      onSpawn: child => {
        const poll = setInterval(() => {
          if (readdirSync(dir).some(name => name.endsWith('.tmp'))) { clearInterval(poll); child.kill(signal); }
        }, 5);
        child.on('close', () => clearInterval(poll));
      },
    });
    assert.equal(result.code, code, `${signal}: ${result.stderr}`);
    assert.match(result.stderr, new RegExp(`interrupted by ${signal}`));
    assert.equal(existsSync(out), false);
    assert.deepEqual(readdirSync(dir), [], `${signal}: temp file removed`);
  }
});

test('paths: spaces, Unicode (NFC/NFD), and long names round-trip', async t => {
  const dir = workspace(t);
  const names = ['with space.txt', 'レシート 領収書.txt', 'café-nfd.txt', 'café-nfc.txt', `${'x'.repeat(200)}.txt`];
  for (const name of names) {
    const out = join(dir, name);
    const result = await run(['--out', out]);
    assert.equal(result.code, 0, `${name}: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).out, out);
    assert.ok(readFileSync(out, 'utf8').startsWith('ORDER o-1'));
  }
  // Linux ext4/btrfs treat NFC and NFD as different names; macOS APFS is
  // normalization-insensitive, so the two spellings are the same file there.
  const distinct = platform() === 'darwin' ? names.length - 1 : names.length;
  assert.equal(readdirSync(dir).length, distinct);
});

test('child timeout: a hung CLI is killed with its process group and reported', async t => {
  const dir = workspace(t);
  const started = Date.now();
  const result = await run(['--out', join(dir, 'r.txt'), '--slow-ms', '60000'], { timeoutMs: 300 });
  assert.equal(result.signal, 'SIGKILL');
  assert.ok(Date.now() - started < 5_000, 'the test does not wait for the hung child');
  assert.throws(() => process.kill(result.pid, 0), /ESRCH/, 'no process left behind');
});
