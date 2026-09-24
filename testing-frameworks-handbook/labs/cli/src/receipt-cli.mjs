#!/usr/bin/env node
// receipt-cli: reads an order JSON (file or stdin) and writes a receipt file
// atomically. The process contract under test:
//   exit 0  success; stdout = machine-readable JSON summary only
//   exit 2  usage error; stderr = one-line message + usage
//   exit 65 invalid input data (EX_DATAERR)
//   exit 73 cannot create output (EX_CANTCREAT: permission, disk full)
//   exit 130/143 interrupted by SIGINT/SIGTERM; temp file removed
// Diagnostics go to stderr only; stdout stays parseable.
import { closeSync, fsyncSync, openSync, readFileSync, renameSync, rmSync, writeSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const USAGE = 'usage: receipt-cli --out <file> [--input <file>|-] [--slow-ms <n>]';
const fail = (code, message) => { process.stderr.write(`receipt-cli: ${message}\n`); process.exitCode = code; };

function parseArgs(argv) {
  const args = { input: '-', slowMs: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--out' && value) { args.out = value; i += 1; }
    else if (flag === '--input' && value) { args.input = value; i += 1; }
    else if (flag === '--slow-ms' && value) { args.slowMs = Number(value); i += 1; }
    else return { error: `unknown or incomplete argument: ${flag}` };
  }
  return args.out ? args : { error: 'missing --out' };
}

function render(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) throw new TypeError('order.items must be a non-empty array');
  const lines = order.items.map(item => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) throw new TypeError(`invalid item ${JSON.stringify(item.sku)}`);
    return `${item.sku}\tx${item.quantity}\t${item.quantity * item.unitPrice}`;
  });
  const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return { text: `${[`ORDER ${order.orderId}`, ...lines, `TOTAL ${total}`].join('\n')}\n`, total };
}

// Write to a temp file in the same directory, fsync, then rename: readers
// see either the old file or the complete new one, never a partial write.
async function atomicWrite(target, text, { slowMs, onTemp }) {
  const temp = join(dirname(target), `.${basename(target)}.${process.pid}.tmp`);
  onTemp(temp);
  const fd = openSync(temp, 'w', 0o644);
  try {
    const bytes = Buffer.from(text);
    const half = Math.floor(bytes.length / 2);
    writeSync(fd, bytes, 0, half);
    // Test seam: widen the window between the two halves so a signal can
    // arrive mid-write. The wait is asynchronous so the handler can run.
    if (slowMs > 0) await new Promise(resolve => setTimeout(resolve, slowMs));
    writeSync(fd, bytes, half, bytes.length - half);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, target);
  onTemp(null);
}

let tempPath = null;
const cleanupAndExit = (signal, code) => {
  if (tempPath) rmSync(tempPath, { force: true });
  process.stderr.write(`receipt-cli: interrupted by ${signal}\n`);
  process.exit(code);
};
process.on('SIGTERM', () => cleanupAndExit('SIGTERM', 143));
process.on('SIGINT', () => cleanupAndExit('SIGINT', 130));

const args = parseArgs(process.argv.slice(2));
if (args.error) {
  fail(2, `${args.error}\n${USAGE}`);
} else {
  let order;
  try {
    order = JSON.parse(args.input === '-' ? readFileSync(0, 'utf8') : readFileSync(args.input, 'utf8'));
  } catch (error) {
    fail(error.code === 'ENOENT' ? 66 : 65, error.code === 'ENOENT' ? `cannot read input: ${args.input}` : 'input is not valid JSON');
  }
  if (order !== undefined) {
    let receipt;
    try { receipt = render(order); } catch (error) { fail(65, error.message); }
    if (receipt) {
      try {
        await atomicWrite(args.out, receipt.text, { slowMs: args.slowMs, onTemp: path => { tempPath = path; } });
        process.stdout.write(`${JSON.stringify({ out: args.out, total: receipt.total, bytes: Buffer.byteLength(receipt.text) })}\n`);
      } catch (error) {
        if (tempPath) rmSync(tempPath, { force: true });
        fail(73, `cannot write ${args.out}: ${error.code ?? error.message}`);
      }
    }
  }
}
