import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { threadId } from 'node:worker_threads';

const outputDirectory = process.env.SEMANTICS_DIR;

if (!outputDirectory) {
  throw new Error('SEMANTICS_DIR must point to the probe output directory');
}

mkdirSync(outputDirectory, { recursive: true });

function record(label, phase, timestamp) {
  const identity = `${process.pid}-${threadId}`;
  const output = join(outputDirectory, `${identity}.jsonl`);
  appendFileSync(output, `${JSON.stringify({
    label,
    phase,
    pid: process.pid,
    threadId,
    timestamp
  })}\n`);
}

export async function probe(label, delayMs = 300) {
  record(label, 'start', Date.now());
  await delay(delayMs);
  record(label, 'end', Date.now());
}
