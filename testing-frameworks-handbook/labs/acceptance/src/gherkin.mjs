// Minimal Gherkin subset (Feature, Background, Rule, Scenario, Scenario
// Outline, Examples, tags, Given/When/Then/And/But) — enough to run
// Specification-by-Example files without a framework dependency.
export function parseFeature(text, path = 'feature') {
  const feature = { path, name: '', background: [], scenarios: [] };
  let tags = [];
  let ruleTags = [];
  let rule = null;
  let current = null;
  let examplesHeader = null;
  let inBackground = false;
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    const lineNo = index + 1;
    if (line === '' || line.startsWith('#')) return;
    if (line.startsWith('@')) { tags = [...tags, ...line.split(/\s+/)]; return; }
    let match;
    if ((match = line.match(/^Feature:\s*(.+)$/))) { feature.name = match[1]; tags = []; return; }
    if (line.startsWith('Background:')) { inBackground = true; current = null; return; }
    if ((match = line.match(/^Rule:\s*(.+)$/))) { rule = match[1]; ruleTags = tags; tags = []; inBackground = false; current = null; return; }
    if ((match = line.match(/^Scenario( Outline)?:\s*(.+)$/))) {
      inBackground = false;
      current = { name: match[2], outline: Boolean(match[1]), rule, tags: [...ruleTags, ...tags], steps: [], examples: [], line: lineNo };
      feature.scenarios.push(current);
      tags = [];
      examplesHeader = null;
      return;
    }
    if (line.startsWith('Examples:')) { examplesHeader = []; return; }
    if (line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
      if (examplesHeader && examplesHeader.length === 0) examplesHeader.push(...cells);
      else current.examples.push(Object.fromEntries(examplesHeader.map((key, i) => [key, cells[i]])));
      return;
    }
    if ((match = line.match(/^(Given|When|Then|And|But)\s+(.+)$/))) {
      const target = inBackground ? feature.background : current?.steps;
      if (!target) throw new Error(`${path}:${lineNo}: step outside a scenario`);
      const previous = target.at(-1)?.keyword;
      const keyword = ['And', 'But'].includes(match[1]) ? previous : match[1];
      target.push({ keyword, text: match[2], line: lineNo });
      return;
    }
    if (current === null && !inBackground && rule === null) return; // feature description
    if (current === null) return; // rule description
    throw new Error(`${path}:${lineNo}: cannot parse "${line}"`);
  });
  return feature;
}

// Expand outlines into concrete scenarios.
export function expand(feature) {
  return feature.scenarios.flatMap(scenario => {
    if (!scenario.outline) return [{ ...scenario, steps: [...feature.background, ...scenario.steps] }];
    return scenario.examples.map((row, index) => ({
      ...scenario,
      name: `${scenario.name} #${index + 1} (${Object.values(row).join(', ')})`,
      steps: [...feature.background, ...scenario.steps.map(step => ({ ...step, text: step.text.replace(/<(\w+)>/g, (_, key) => row[key]) }))],
    }));
  });
}

export function createRegistry() {
  const steps = [];
  return {
    define(pattern, fn) { steps.push({ pattern, fn }); },
    match(text) {
      const found = steps.map(step => ({ step, args: text.match(step.pattern) })).filter(candidate => candidate.args);
      if (found.length === 0) return { error: `undefined step: ${text}` };
      if (found.length > 1) return { error: `ambiguous step: ${text} (${found.map(candidate => candidate.step.pattern).join(' | ')})` };
      return { fn: found[0].step.fn, args: found[0].args.slice(1) };
    },
    patterns: () => steps.map(step => step.pattern),
  };
}

export async function runScenario(scenario, registry, { slowStepMs = 50, now = () => performance.now() } = {}) {
  const world = {};
  const timings = [];
  for (const step of scenario.steps) {
    const matched = registry.match(step.text);
    if (matched.error) throw new Error(`${scenario.name}: ${matched.error}`);
    const started = now();
    await matched.fn(world, ...matched.args);
    timings.push({ step: step.text, ms: now() - started });
  }
  return { slow: timings.filter(timing => timing.ms > slowStepMs) };
}

// Lints that keep feature files about business behavior.
export const UI_DETAIL = /\b(click|clicks|button|page|field|input box|dropdown|css|xpath|selector|url|screen|scroll|type(s)? into|enter(s)? "[^"]*" in)\b/i;

export function lintFeature(feature) {
  const problems = [];
  const all = [...feature.background, ...feature.scenarios.flatMap(scenario => scenario.steps)];
  for (const step of all) if (UI_DETAIL.test(step.text)) problems.push(`${feature.path}:${step.line}: UI detail in step "${step.text}"`);
  const seen = new Map();
  for (const scenario of expand(feature)) {
    const signature = scenario.steps.map(step => `${step.keyword} ${step.text}`).join('\n');
    if (seen.has(signature)) problems.push(`${feature.path}:${scenario.line}: duplicate of "${seen.get(signature)}"`);
    else seen.set(signature, scenario.name);
  }
  for (const scenario of feature.scenarios) {
    if (!scenario.tags.some(tag => /^@R\d+$/.test(tag))) problems.push(`${feature.path}:${scenario.line}: scenario "${scenario.name}" has no rule tag`);
  }
  return problems;
}
