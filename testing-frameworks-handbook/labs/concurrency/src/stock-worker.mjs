// Worker thread that decrements shared stock. Memory layout (Int32Array):
//   [0] stock, [1] barrier arrivals, [2] barrier generation, [3] mutex,
//   [4] successful reservations
// Modes: 'unsafe' (read, barrier, write), 'cas' (compare-and-swap loop),
// 'mutex' (Atomics-based spin/wait lock).
import { workerData, parentPort } from 'node:worker_threads';

const { buffer, mode, parties, attempts } = workerData;
const cells = new Int32Array(buffer);

function barrier() {
  const generation = Atomics.load(cells, 2);
  if (Atomics.add(cells, 1, 1) + 1 === parties) {
    Atomics.store(cells, 1, 0);
    Atomics.add(cells, 2, 1);
    Atomics.notify(cells, 2);
  } else {
    while (Atomics.load(cells, 2) === generation) Atomics.wait(cells, 2, generation, 1_000);
  }
}

function lock() {
  while (Atomics.compareExchange(cells, 3, 0, 1) !== 0) Atomics.wait(cells, 3, 1, 5);
}
function unlock() {
  Atomics.store(cells, 3, 0);
  Atomics.notify(cells, 3, 1);
}

const log = [];
for (let i = 0; i < attempts; i += 1) {
  if (mode === 'unsafe') {
    const seen = Atomics.load(cells, 0);
    // Everyone has read the same value before anyone writes: the
    // interleaving that loses updates, forced by a barrier instead of sleep.
    barrier();
    if (seen > 0) {
      Atomics.store(cells, 0, seen - 1);
      Atomics.add(cells, 4, 1);
      log.push({ read: seen, wrote: seen - 1 });
    }
    barrier();
  } else if (mode === 'cas') {
    barrier();
    for (;;) {
      const seen = Atomics.load(cells, 0);
      if (seen <= 0) break;
      if (Atomics.compareExchange(cells, 0, seen, seen - 1) === seen) { Atomics.add(cells, 4, 1); log.push({ read: seen, wrote: seen - 1 }); break; }
    }
    barrier();
  } else {
    barrier();
    lock();
    const seen = Atomics.load(cells, 0);
    if (seen > 0) { Atomics.store(cells, 0, seen - 1); Atomics.add(cells, 4, 1); log.push({ read: seen, wrote: seen - 1 }); }
    unlock();
    barrier();
  }
}
parentPort.postMessage({ log });
