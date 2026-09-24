// Risk-based mutation policy: which lanes a change must run inside the PR
// budget, which survivors need an explicit decision, and how review work is
// measured. Everything here is pure so the policy itself is unit-testable.

export const RISK_ORDER = Object.freeze({ high: 0, medium: 1, low: 2 });
export const CLASSIFICATIONS = Object.freeze(['equivalent', 'low-value', 'accepted-risk']);
export const REVIEW_OUTCOMES = Object.freeze([
  'test-added', 'code-fixed', 'equivalent', 'low-value', 'accepted-risk',
]);
export const ACTION_OUTCOMES = Object.freeze(['test-added', 'code-fixed']);
const HANDBOOK_PREFIX = 'testing-frameworks-handbook/';

export function normalizeChangedPath(path) {
  const unix = path.trim().replaceAll('\\', '/');
  return unix.startsWith(HANDBOOK_PREFIX) ? unix.slice(HANDBOOK_PREFIX.length) : unix;
}

export function pathMatches(file, pattern) {
  if (pattern.endsWith('/')) return file.startsWith(pattern);
  return file === pattern;
}

function laneById(riskMap, id) {
  const lane = riskMap.lanes.find(candidate => candidate.id === id);
  if (!lane) throw new Error(`risk map references unknown lane ${id}`);
  return lane;
}

// Changed files -> lanes. High-risk lanes are admitted first; anything that
// does not fit the PR budget is deferred to the scheduled full lane with a
// reason instead of being dropped silently.
export function planLanes({ changedFiles, riskMap, budgetSeconds = riskMap.prBudgetSeconds }) {
  const files = [...new Set(changedFiles.map(normalizeChangedPath).filter(Boolean))].sort();
  const candidates = new Map();
  const unmapped = [];

  for (const file of files) {
    const modules = riskMap.modules.filter(module => module.paths.some(pattern => pathMatches(file, pattern)));
    if (modules.length === 0) {
      if (riskMap.sourceRoots.some(root => pathMatches(file, root)) && !riskMap.ignored.some(pattern => pathMatches(file, pattern))) {
        unmapped.push(file);
      }
      continue;
    }
    for (const module of modules) {
      for (const laneId of module.lanes) {
        const lane = laneById(riskMap, laneId);
        const current = candidates.get(laneId);
        const risk = current && RISK_ORDER[current.risk] <= RISK_ORDER[module.risk] ? current.risk : module.risk;
        candidates.set(laneId, {
          lane,
          risk,
          reasons: [...(current?.reasons ?? []), `${file} (${module.id}: ${module.risk})`],
        });
      }
    }
  }

  const ordered = [...candidates.values()].sort((left, right) =>
    RISK_ORDER[left.risk] - RISK_ORDER[right.risk]
    || left.lane.estimatedSeconds - right.lane.estimatedSeconds
    || left.lane.id.localeCompare(right.lane.id));

  const selected = [];
  const deferred = [];
  let estimatedSeconds = 0;
  for (const candidate of ordered) {
    const entry = { id: candidate.lane.id, risk: candidate.risk, estimatedSeconds: candidate.lane.estimatedSeconds, reasons: candidate.reasons };
    if (candidate.risk === 'low') {
      deferred.push({ ...entry, deferral: 'low-risk: scheduled full lane only' });
    } else if (estimatedSeconds + candidate.lane.estimatedSeconds > budgetSeconds) {
      deferred.push({ ...entry, deferral: `budget: ${estimatedSeconds}+${candidate.lane.estimatedSeconds}s exceeds ${budgetSeconds}s` });
    } else {
      estimatedSeconds += candidate.lane.estimatedSeconds;
      selected.push(entry);
    }
  }
  return { changedFiles: files, budgetSeconds, estimatedSeconds, selected, deferred, unmapped };
}

export function fullPlan(riskMap) {
  return {
    changedFiles: [],
    budgetSeconds: null,
    estimatedSeconds: riskMap.lanes.reduce((sum, lane) => sum + lane.estimatedSeconds, 0),
    selected: riskMap.lanes.map(lane => ({ id: lane.id, risk: 'scheduled', estimatedSeconds: lane.estimatedSeconds, reasons: ['scheduled full lane'] })),
    deferred: [],
    unmapped: [],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateLedger(ledger, riskMap, today) {
  const errors = [];
  const laneIds = new Set(riskMap.lanes.map(lane => lane.id));
  const now = Date.parse(`${today}T00:00:00Z`);
  const seen = new Set();

  for (const decision of ledger.decisions) {
    const where = `decision ${decision.id ?? '(missing id)'}`;
    if (!decision.id || seen.has(decision.id)) errors.push(`${where}: id must be unique`);
    seen.add(decision.id);
    if (!laneIds.has(decision.lane)) errors.push(`${where}: unknown lane ${decision.lane}`);
    if (!CLASSIFICATIONS.includes(decision.classification)) errors.push(`${where}: classification must be one of ${CLASSIFICATIONS.join(', ')}`);
    for (const field of ['file', 'rationale', 'owner', 'reviewBy', 'evidence']) {
      if (typeof decision[field] !== 'string' || decision[field].trim() === '') errors.push(`${where}: ${field} is required`);
    }
    if (!decision.match || typeof decision.match !== 'object') errors.push(`${where}: match is required`);
    const reviewBy = Date.parse(`${decision.reviewBy}T00:00:00Z`);
    if (Number.isNaN(reviewBy)) {
      errors.push(`${where}: reviewBy must be YYYY-MM-DD`);
    } else if (reviewBy < now) {
      errors.push(`${where}: expired on ${decision.reviewBy}; re-review or delete it`);
    } else if (decision.classification === 'accepted-risk' && reviewBy - now > 90 * DAY_MS) {
      errors.push(`${where}: accepted-risk decisions must be re-reviewed within 90 days`);
    }
  }

  for (const review of ledger.reviews) {
    const where = `review ${review.id ?? '(missing id)'}`;
    if (!review.id || seen.has(review.id)) errors.push(`${where}: id must be unique`);
    seen.add(review.id);
    if (!REVIEW_OUTCOMES.includes(review.outcome)) errors.push(`${where}: outcome must be one of ${REVIEW_OUTCOMES.join(', ')}`);
    for (const field of ['source', 'mutant', 'reviewedAt', 'evidence']) {
      if (typeof review[field] !== 'string' || review[field].trim() === '') errors.push(`${where}: ${field} is required`);
    }
  }
  return errors;
}

export function reviewActionRate(reviews) {
  const bySource = new Map();
  for (const review of reviews) {
    const bucket = bySource.get(review.source) ?? { reviewed: 0, actioned: 0 };
    bucket.reviewed += 1;
    if (ACTION_OUTCOMES.includes(review.outcome)) bucket.actioned += 1;
    bySource.set(review.source, bucket);
  }
  const reviewed = reviews.length;
  const actioned = reviews.filter(review => ACTION_OUTCOMES.includes(review.outcome)).length;
  return {
    reviewed,
    actioned,
    rate: reviewed === 0 ? null : actioned / reviewed,
    bySource: Object.fromEntries([...bySource.entries()].sort(([left], [right]) => left.localeCompare(right))
      .map(([source, bucket]) => [source, { ...bucket, rate: bucket.actioned / bucket.reviewed }])),
  };
}

// Stryker JSON schema: files[path].mutants[] with status and location.
// A decision matches on mutator + original text + replacement so that line
// shifts do not invalidate it, but any change to the mutated code does.
export function strykerSurvivors(report) {
  const survivors = [];
  let total = 0;
  let detected = 0;
  for (const [file, result] of Object.entries(report.files)) {
    const lines = result.source.split('\n');
    for (const mutant of result.mutants) {
      total += 1;
      if (mutant.status === 'Killed' || mutant.status === 'Timeout') {
        detected += 1;
        continue;
      }
      if (mutant.status === 'Ignored') continue;
      survivors.push({
        file,
        status: mutant.status,
        mutator: mutant.mutatorName,
        line: mutant.location.start.line,
        original: sliceLocation(lines, mutant.location),
        replacement: mutant.replacement,
      });
    }
  }
  return { total, detected, survivors };
}

function sliceLocation(lines, { start, end }) {
  if (start.line === end.line) return lines[start.line - 1].slice(start.column - 1, end.column - 1);
  const parts = [lines[start.line - 1].slice(start.column - 1)];
  for (let line = start.line + 1; line < end.line; line += 1) parts.push(lines[line - 1]);
  parts.push(lines[end.line - 1].slice(0, end.column - 1));
  return parts.join('\n');
}

export function gateSurvivors({ survivors, decisions, lane }) {
  const laneDecisions = decisions.filter(decision => decision.lane === lane);
  const used = new Set();
  const undecided = [];
  const decided = [];
  for (const survivor of survivors) {
    const decision = laneDecisions.find(candidate =>
      candidate.file === survivor.file
      && candidate.match.mutator === survivor.mutator
      && candidate.match.original === survivor.original
      && candidate.match.replacement === survivor.replacement);
    if (decision) {
      used.add(decision.id);
      decided.push({ ...survivor, decision: decision.id, classification: decision.classification });
    } else {
      undecided.push(survivor);
    }
  }
  const stale = laneDecisions.filter(decision => !used.has(decision.id)).map(decision => decision.id);
  return { decided, undecided, stale, passed: undecided.length === 0 && stale.length === 0 };
}
