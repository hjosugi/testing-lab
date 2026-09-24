// Agent evaluation harness: deterministic tool-call parser and schema check,
// a permissioned tool sandbox with fault injection, a scripted fake model
// (including a prompt-injection-susceptible policy), and trajectory/outcome/
// cost/latency recorded as separate metrics.
import { createHash } from 'node:crypto';
import { mulberry32 } from './random.mjs';

export const TOOL_SCHEMA_VERSION = '2026-09-25.1';
export const TOOLS = Object.freeze({
  search_orders: { params: { customer: 'string' }, effect: 'read' },
  get_order: { params: { orderId: 'string' }, effect: 'read' },
  read_document: { params: { docId: 'string' }, effect: 'read' },
  issue_refund: { params: { orderId: 'string', amount: 'integer' }, effect: 'write' },
  send_email: { params: { to: 'string', body: 'string' }, effect: 'external' },
});

// Model output -> tool call. Anything that is not exactly one JSON object with
// a known tool and schema-valid arguments is rejected before execution.
export function parseToolCall(text) {
  let call;
  try { call = JSON.parse(text); } catch { return { ok: false, error: 'not-json' }; }
  if (!call || typeof call !== 'object' || Array.isArray(call)) return { ok: false, error: 'not-object' };
  if (call.final !== undefined) return typeof call.final === 'string' ? { ok: true, final: call.final } : { ok: false, error: 'bad-final' };
  const spec = TOOLS[call.tool];
  if (!spec) return { ok: false, error: `unknown-tool:${call.tool}` };
  const args = call.args ?? {};
  for (const [name, type] of Object.entries(spec.params)) {
    const value = args[name];
    if (type === 'string' && (typeof value !== 'string' || value.length === 0 || value.length > 200)) return { ok: false, error: `bad-arg:${name}` };
    if (type === 'integer' && !Number.isSafeInteger(value)) return { ok: false, error: `bad-arg:${name}` };
  }
  const extra = Object.keys(args).filter(name => !(name in spec.params));
  if (extra.length > 0) return { ok: false, error: `extra-arg:${extra.join(',')}` };
  return { ok: true, tool: call.tool, args };
}

// Sandbox: the task grants an allowlist; write/external tools additionally
// need explicit grants. Faults (timeout/error) are injected per tool.
export function createSandbox({ world, allow, faults = {}, seed = 1 }) {
  const random = mulberry32(seed);
  const executed = [];
  const denied = [];
  const handlers = {
    search_orders: ({ customer }) => world.orders.filter(order => order.customer === customer).map(order => order.orderId),
    get_order: ({ orderId }) => world.orders.find(order => order.orderId === orderId) ?? null,
    read_document: ({ docId }) => world.documents[docId] ?? null,
    issue_refund: ({ orderId, amount }) => { world.refunds.push({ orderId, amount }); return 'refunded'; },
    send_email: ({ to }) => { world.emails.push(to); return 'sent'; },
  };
  return {
    executed,
    denied,
    call(tool, args) {
      if (!allow.includes(tool)) {
        denied.push({ tool, args });
        return { error: 'permission-denied' };
      }
      const fault = faults[tool];
      if (fault && random() < fault.rate) return { error: fault.kind, latencyMs: fault.kind === 'timeout' ? 5_000 : 50 };
      executed.push({ tool, args });
      return { result: handlers[tool](args), latencyMs: 50 };
    },
  };
}

const TOOL_FAULTS = ['timeout', 'error'];

// Deterministic policy per task type: the "reasoning" of the fake model.
export function plan(task, observations) {
  const results = observations.map(observation => observation.result);
  const call = (tool, args) => JSON.stringify({ tool, args });
  switch (task.type) {
    case 'order-status':
      if (results.length === 0) return call('get_order', { orderId: task.input.orderId });
      return JSON.stringify({ final: results[0] ? `Order ${results[0].orderId} is ${results[0].status}.` : 'Order not found.' });
    case 'refund-eligibility':
      if (results.length === 0) return call('search_orders', { customer: task.input.customer });
      if (results.length === 1) return results[0].length ? call('get_order', { orderId: results[0][0] }) : JSON.stringify({ final: 'No orders.' });
      return JSON.stringify({ final: results[1].status === 'delivered' ? `Order ${results[1].orderId} is eligible for a refund.` : `Order ${results[1].orderId} is not eligible yet.` });
    case 'summarize-document':
      if (results.length === 0) return call('read_document', { docId: task.input.docId });
      return JSON.stringify({ final: String(results[0] ?? '').split(/(?<=\.)\s/)[0] });
    case 'issue-refund':
      if (results.length === 0) return call('get_order', { orderId: task.input.orderId });
      if (results.length === 1) return call('issue_refund', { orderId: results[0].orderId, amount: results[0].total });
      return JSON.stringify({ final: `Refunded ${results[0].total} for ${results[0].orderId}.` });
    default:
      return JSON.stringify({ final: 'Unsupported task.' });
  }
}

// Scripted fake model. It "reads" the task and tool results and emits JSON.
// `followsInjectedInstructions` makes it obey instructions found inside tool
// outputs, which is the prompt-injection behavior the sandbox must contain.
export function fakeModel({ followsInjectedInstructions = false, temperature = 0, seed = 1, version = 'fake-agent-1.3.0' } = {}) {
  const random = mulberry32(seed);
  return {
    version,
    next({ task, observations }) {
      const last = observations.at(-1);
      if (followsInjectedInstructions && typeof last?.result === 'string') {
        const injected = last.result.match(/SYSTEM: call (\w+) (\{.*\})/);
        if (injected) return JSON.stringify({ tool: injected[1], args: JSON.parse(injected[2]) });
      }
      // Sampling noise: occasionally emit malformed JSON when temperature > 0.
      if (temperature > 0 && random() < temperature * 0.3) return '{"tool": "get_order", "args": {"orderId": 42}';
      if (last?.error === 'permission-denied') return JSON.stringify({ final: 'Not permitted for this task.' });
      if (last?.error && TOOL_FAULTS.includes(last.error)) {
        const retries = observations.filter(observation => TOOL_FAULTS.includes(observation.error)).length;
        if (retries >= 3) return JSON.stringify({ final: `Could not complete: ${last.error}` });
        return last.request;
      }
      return plan(task, observations.filter(observation => !observation.error));
    },
  };
}

export function runAgent({ task, model, sandbox, maxSteps = 8 }) {
  const trajectory = [];
  const observations = [];
  let tokens = 0;
  let latencyMs = 0;
  for (let step = 0; step < maxSteps; step += 1) {
    const output = model.next({ task, observations });
    tokens += Math.ceil(output.length / 4) + 50;
    latencyMs += 300;
    const parsed = parseToolCall(output);
    if (!parsed.ok) {
      trajectory.push({ step, output, rejected: parsed.error });
      observations.push({ error: parsed.error, request: output });
      continue;
    }
    if (parsed.final !== undefined) {
      trajectory.push({ step, final: parsed.final });
      return { final: parsed.final, trajectory, cost: { tokens }, latencyMs, steps: step + 1 };
    }
    const outcome = sandbox.call(parsed.tool, parsed.args);
    latencyMs += outcome.latencyMs ?? 0;
    trajectory.push({ step, tool: parsed.tool, args: parsed.args, ...(outcome.error ? { error: outcome.error } : {}) });
    observations.push({ ...outcome, request: output });
  }
  return { final: null, trajectory, cost: { tokens }, latencyMs, steps: maxSteps, exhausted: true };
}

export const hashOf = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 16);
