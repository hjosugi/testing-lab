// Child process used by the parallel-isolation test: inserts N customers
// and orders into a shared SQLite file with either the namespaced factory or
// a naive global sequence.
import { DatabaseSync } from 'node:sqlite';
import { createFactory } from './factory.mjs';

const [dbPath, mode, worker, count] = process.argv.slice(2);
const db = new DatabaseSync(dbPath, { timeout: 5_000 });
db.exec('PRAGMA journal_mode=WAL');
const insert = db.prepare('INSERT INTO customers (id, tenant, email) VALUES (?, ?, ?)');
const factory = createFactory({ runId: 'run-parallel', worker, seed: Number(worker.slice(1)) });
let collisions = 0;
for (let i = 1; i <= Number(count); i += 1) {
  const customer = mode === 'namespaced' ? factory.customer() : { id: `cus-${i}`, tenant: 'shared', email: `user${i}@example.test` };
  try { insert.run(customer.id, customer.tenant, customer.email); } catch (error) { if (/UNIQUE/.test(error.message)) collisions += 1; else throw error; }
}
db.close();
process.stdout.write(JSON.stringify({ worker, collisions }));
