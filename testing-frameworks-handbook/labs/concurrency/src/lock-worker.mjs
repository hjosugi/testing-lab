// Two workers take two locks. 'opposite' order deadlocks (forced by a
// barrier after the first lock); 'ordered' always takes lock A then B.
// Lock waits have a deadline so a deadlock becomes evidence, not a hang.
import { workerData, parentPort } from 'node:worker_threads';

const { buffer, id, order, deadlineMs } = workerData;
const cells = new Int32Array(buffer); // [0] lock A, [1] lock B, [2] arrivals, [3] generation

function barrier(parties) {
  const generation = Atomics.load(cells, 3);
  if (Atomics.add(cells, 2, 1) + 1 === parties) { Atomics.store(cells, 2, 0); Atomics.add(cells, 3, 1); Atomics.notify(cells, 3); }
  else while (Atomics.load(cells, 3) === generation) Atomics.wait(cells, 3, generation, 1_000);
}

function acquire(index, deadline) {
  while (Atomics.compareExchange(cells, index, 0, id) !== 0) {
    if (Date.now() > deadline) return false;
    Atomics.wait(cells, index, Atomics.load(cells, index), 5);
  }
  return true;
}

const [first, second] = order === 'ordered' || id === 1 ? [0, 1] : [1, 0];
const deadline = Date.now() + deadlineMs;
const held = [];
// Opposite order: both take their first lock, then meet, forcing the
// A->B / B->A cycle. Ordered: meet first, then contend for the same lock.
if (order !== 'ordered') {
  acquire(first, deadline);
  held.push(first === 0 ? 'A' : 'B');
  barrier(2);
} else {
  barrier(2);
  acquire(first, deadline);
  held.push(first === 0 ? 'A' : 'B');
}
const gotSecond = acquire(second, deadline);
if (gotSecond) held.push(second === 0 ? 'A' : 'B');
parentPort.postMessage({ id, completed: gotSecond, held, waitingFor: gotSecond ? null : (second === 0 ? 'A' : 'B') });
// In the deadlock scenario both threads report before either releases, so
// the evidence shows the whole cycle rather than whoever timed out first.
if (order !== 'ordered') barrier(2);
for (const index of [second, first]) if (Atomics.load(cells, index) === id) { Atomics.store(cells, index, 0); Atomics.notify(cells, index); }
