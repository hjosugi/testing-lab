#!/usr/bin/env node
// Runs the CI-sized profiles once more as a report (the tests are the gate),
// writes JSON artifacts with environment, seeds, histograms, and saturation,
// and prints a Markdown summary. `--repeats N` adds seeded load repeats for a
// confidence spread; `--baseline file` compares p95 only on the same host.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTargetServer } from '../src/target-server.mjs';
import { runOpenModel } from '../src/load.mjs';
import { capacityReport, compareToBaseline, evaluateSlo, record, repeatConfidence, saturationProbe, SLO } from '../src/profiles.mjs';

const args = process.argv.slice(2);
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const repeats = Number(option('--repeats') ?? 3);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'build', 'results');
mkdirSync(out, { recursive: true });
const TARGET = { workers: 8, serviceMs: 40, queueLimit: 32 };

async function withTarget(body) {
  const target = createTargetServer(TARGET);
  const url = `${await target.listen()}/quote`;
  try { return await body(target, url); } finally { await target.close(); }
}

const loads = [];
for (let repeat = 0; repeat < repeats; repeat += 1) {
  loads.push(await withTarget(async (target, url) => record({
    kind: 'load',
    target,
    run: await runOpenModel({ url, phases: [{ rate: target.capacityPerSecond * SLO.normalLoadFraction, durationMs: 4000 }], arrival: 'poisson', seed: 20260925 + repeat, warmupMs: 1000, sampleSaturation: saturationProbe(target) }),
  })));
}
const capacity = await withTarget(async (target, url) => {
  const steps = [0.25, 0.5, 0.75, 1, 1.25, 1.5].map(fraction => ({ rate: target.capacityPerSecond * fraction, durationMs: 1500 }));
  const run = await runOpenModel({ url, phases: steps, warmupMs: 0, sampleSaturation: saturationProbe(target) });
  return { ...record({ kind: 'capacity', target, run }), capacity: capacityReport(run, steps) };
});

const confidence = repeatConfidence(loads);
const verdicts = loads.map(result => {
  try { return evaluateSlo(result); } catch (error) { return { met: false, violations: [error.message] }; }
});
const summary = { slo: SLO, loads, confidence, verdicts, capacity };
const baselinePath = option('--baseline');
if (baselinePath) summary.baseline = compareToBaseline(loads[0], JSON.parse(readFileSync(baselinePath, 'utf8')));
writeFileSync(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
if (args.includes('--write-baseline')) writeFileSync(option('--write-baseline'), `${JSON.stringify({ ...loads[0], confidence }, null, 2)}\n`);

const rows = loads.map((result, index) => `| load #${index + 1} (seed ${result.seed}) | ${result.analysis.latencyMs.p50} | ${result.analysis.latencyMs.p95} | ${result.analysis.latencyMs.p99} | ${(result.analysis.errorRate * 100).toFixed(2)}% | ${result.analysis.throughputPerSecond} | ${result.saturation.peakUtilization} | ${verdicts[index].met ? 'met' : verdicts[index].violations.join('; ')} |`);
console.log([
  `## Performance profiles (${loads[0].environment.platform}/${loads[0].environment.arch}, ${loads[0].environment.cpuCount} CPU, Node ${loads[0].environment.node})`,
  '',
  '| Run | p50 ms | p95 ms | p99 ms | errors | req/s | peak util | SLO |',
  '|---|---:|---:|---:|---:|---:|---:|---|',
  ...rows,
  '',
  `p95 spread over ${confidence.repeats} seeded repeats: ${confidence.p95Ms.min}–${confidence.p95Ms.max} ms (relative ${confidence.relativeSpread}).`,
  `Capacity limit meeting the SLO: ${capacity.capacity.capacityLimitPerSecond} req/s (modeled ${capacity.target.modeledCapacityPerSecond}); above it: ${capacity.capacity.degradation.map(step => `${step.rate}/s ${step.mode}`).join(', ')}.`,
  summary.baseline ? `Baseline: ${JSON.stringify(summary.baseline)}` : 'Baseline: not requested',
].join('\n'));
