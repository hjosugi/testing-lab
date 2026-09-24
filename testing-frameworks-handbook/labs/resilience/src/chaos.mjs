// Real-HTTP chaos harness: a provider server, a fault-injecting proxy in front
// of it (toxiproxy-style), and an experiment runner with a steady-state
// hypothesis, a blast radius, abort conditions, and rollback.
import http from 'node:http';
import { mulberry32 } from './sim.mjs';

export function startProvider(provider) {
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      const reply = provider.handle(JSON.parse(body));
      response.writeHead(reply.status === 'unavailable' ? 503 : 200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(reply));
    });
  });
  return listen(server);
}

// Faults: { errorRate, dropResponseRate, latencyMs } applied to the fraction
// of requests selected by `blastRadius` (seeded, so experiments repeat).
export function startFaultProxy(upstream, { seed = 1 } = {}) {
  const random = mulberry32(seed);
  let faults = null;
  let blastRadius = 0;
  const stats = { forwarded: 0, injectedErrors: 0, droppedResponses: 0, delayed: 0 };
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', async () => {
      const affected = faults !== null && random() < blastRadius;
      if (affected && faults.latencyMs) { stats.delayed += 1; await new Promise(resolve => setTimeout(resolve, faults.latencyMs)); }
      if (affected && random() < (faults.errorRate ?? 0)) {
        stats.injectedErrors += 1;
        response.writeHead(503, { 'content-type': 'application/json' });
        response.end('{"status":"unavailable"}');
        return;
      }
      const upstreamRequest = http.request(upstream, { method: 'POST', headers: { 'content-type': 'application/json' } }, upstreamResponse => {
        let reply = '';
        upstreamResponse.on('data', chunk => { reply += chunk; });
        upstreamResponse.on('end', () => {
          stats.forwarded += 1;
          if (affected && random() < (faults.dropResponseRate ?? 0)) {
            // The charge happened upstream; the caller only sees a reset.
            stats.droppedResponses += 1;
            request.socket.destroy();
            return;
          }
          response.writeHead(upstreamResponse.statusCode, { 'content-type': 'application/json' });
          response.end(reply);
        });
      });
      upstreamRequest.end(body);
    });
  });
  return listen(server).then(handle => ({
    ...handle,
    stats,
    inject(nextFaults, radius) { faults = nextFaults; blastRadius = radius; },
    rollback() { faults = null; blastRadius = 0; },
    get active() { return faults !== null; },
  }));
}

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); },
  };
}

export function httpTransport(url) {
  const agent = new http.Agent({ keepAlive: false });
  return (message, { timeoutMs }) => new Promise((resolve, reject) => {
    const request = http.request(url, { method: 'POST', agent, timeout: timeoutMs, headers: { 'content-type': 'application/json' } }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(JSON.parse(body)));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
    request.end(JSON.stringify(message));
  });
}

// Experiment: measure steady state, inject within the blast radius, keep
// checking the abort condition on a rolling window, roll back on abort or at
// the end, and verify steady state is restored.
export async function runExperiment({ name, probe, proxy, faults, blastRadius, steadyState, abortWhen, windowSize = 10, maxProbes = 60 }) {
  const measure = async count => {
    const outcomes = [];
    for (let i = 0; i < count; i += 1) outcomes.push(await probe());
    return outcomes;
  };
  const successRate = outcomes => outcomes.filter(Boolean).length / outcomes.length;
  const before = successRate(await measure(windowSize));
  if (!steadyState(before)) return { name, status: 'not-started', reason: `steady state not met before injection (${before})` };

  proxy.inject(faults, blastRadius);
  const during = [];
  let aborted = null;
  try {
    for (let i = 0; i < maxProbes; i += 1) {
      during.push(await probe());
      const window = during.slice(-windowSize);
      if (window.length === windowSize && abortWhen(successRate(window))) {
        aborted = `abort condition met after ${during.length} probes (window success ${successRate(window)})`;
        break;
      }
    }
  } finally {
    proxy.rollback();
  }
  const after = successRate(await measure(windowSize));
  return {
    name,
    status: aborted ? 'aborted' : 'completed',
    reason: aborted,
    blastRadius,
    before,
    during: successRate(during),
    after,
    restored: steadyState(after),
    probes: during.length,
  };
}
