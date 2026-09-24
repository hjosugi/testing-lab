// Synthetic commit history for the fixture project: changed files and the
// tests that truly fail (ground truth), including a runtime config file that
// no import graph can see.
import { mulberry32 } from './random.mjs';
import { dependencySelect } from './selection.mjs';

export function syntheticCommits(graph, { seed = 77, count = 40 } = {}) {
  const random = mulberry32(seed);
  const all = [...graph.keys()].filter(file => file.startsWith('test/')).sort();
  const sources = ['src/money.mjs', 'src/cart.mjs', 'src/payment.mjs', 'src/email.mjs', 'config/payment.json'];
  return Array.from({ length: count }, () => {
    const changed = [sources[Math.floor(random() * sources.length)]];
    const reachable = changed[0] === 'config/payment.json' ? ['test/payment.test.mjs'] : dependencySelect(graph, changed).tests;
    const failing = random() < 0.35 ? [reachable[Math.floor(random() * reachable.length)]] : [];
    return { changed, failing, allTests: all };
  });
}
