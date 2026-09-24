// A checkout-quote HTTP service with an explicit capacity model so load,
// stress, spike, soak, and capacity profiles have a known ground truth:
//   capacity ≈ workers / serviceMs requests per millisecond.
// Admission control sheds with 503 once the bounded queue is full, which is
// the degradation behavior the capacity profile has to document.
import { createServer } from 'node:http';

export function createTargetServer({
  workers = 4,
  serviceMs = 10,
  queueLimit = 32,
  leakBytesPerRequest = 0,
  clock = () => performance.now(),
} = {}) {
  let busy = 0;
  let maxQueueDepth = 0;
  let stallUntil = 0;
  let served = 0;
  let shed = 0;
  const queue = [];
  const leaked = [];

  const quote = body => {
    const items = JSON.parse(body || '[]');
    if (!Array.isArray(items)) throw new TypeError('items must be an array');
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const startNext = () => {
    while (busy < workers && queue.length > 0) {
      const job = queue.shift();
      busy += 1;
      const delay = Math.max(serviceMs, stallUntil - clock());
      setTimeout(() => {
        busy -= 1;
        served += 1;
        if (leakBytesPerRequest > 0) leaked.push(Buffer.alloc(leakBytesPerRequest, 1));
        job();
        startNext();
      }, delay);
    }
  };

  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      if (request.url === '/metrics') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(stats()));
        return;
      }
      if (queue.length >= queueLimit) {
        shed += 1;
        response.writeHead(503, { 'content-type': 'application/json', 'retry-after': '1' });
        response.end('{"error":"overloaded"}');
        return;
      }
      queue.push(() => {
        try {
          const total = quote(body);
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ total }));
        } catch {
          response.writeHead(400, { 'content-type': 'application/json' });
          response.end('{"error":"invalid"}');
        }
      });
      maxQueueDepth = Math.max(maxQueueDepth, queue.length);
      startNext();
    });
  });
  server.keepAliveTimeout = 5_000;

  const stats = () => ({
    workers, serviceMs, queueLimit, busy, queueDepth: queue.length, maxQueueDepth, served, shed,
    retainedBytes: leaked.reduce((sum, buffer) => sum + buffer.length, 0),
  });

  return {
    server,
    stats,
    capacityPerSecond: workers * 1000 / serviceMs,
    // Freeze every worker until `ms` from now (GC pause, failover, lock wait).
    stall(ms) { stallUntil = clock() + ms; },
    async listen() {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
