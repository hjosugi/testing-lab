import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const DEFAULT_MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 1_000;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const CHECKOUT_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Checkout lab</title>
    <style>
      :root {
        --font-family-body: ui-sans-serif, system-ui, sans-serif;
        --font-size-body: 1rem;
        --font-size-title: clamp(2rem, 8vw, 3.5rem);
        --font-size-status: 1.125rem;
        --line-height-body: 1.5;
        --line-height-title: 1;
        --space-1: 0.5rem;
        --space-2: 1rem;
        --space-3: 1.5rem;
        --space-4: 2rem;
        --content-max-width: 34rem;
        --status-min-height: 1.5em;
        --border-width: 1px;
        --radius-control: 0.75rem;
        --color-background: #f5f7fb;
        --color-surface: #ffffff;
        --color-text: #18202a;
        --color-accent: #3157d5;
        --color-accent-contrast: #ffffff;
        --color-border: #d8dfeb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: var(--space-3);
        color: var(--color-text);
        background: var(--color-background);
        font-family: var(--font-family-body);
        font-size: var(--font-size-body);
        line-height: var(--line-height-body);
      }

      main {
        width: min(100%, var(--content-max-width));
        padding: var(--space-4);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-control);
        background: var(--color-surface);
      }

      h1 {
        margin: 0 0 var(--space-3);
        font-size: var(--font-size-title);
        line-height: var(--line-height-title);
      }

      button {
        padding: var(--space-2) var(--space-3);
        border: 0;
        border-radius: var(--radius-control);
        color: var(--color-accent-contrast);
        background: var(--color-accent);
        font: inherit;
        cursor: pointer;
      }

      [role="status"] {
        min-height: var(--status-min-height);
        margin: var(--space-3) 0 0;
        font-size: var(--font-size-status);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Checkout</h1>
      <button id="buy">Buy two books</button>
      <p id="status" role="status">Ready</p>
    </main>
    <script>
      document.querySelector('#buy').addEventListener('click', async () => {
        const response = await fetch('/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            orderId: 'o-1',
            token: 't-1',
            items: [{ sku: 'book', quantity: 2, unitPrice: 600 }]
          })
        });
        const body = await response.json();
        document.querySelector('#status').textContent = response.ok
          ? body.status + ': ' + body.total
          : body.title + ' (' + body.traceId + ')';
      });
    </script>
  </body>
</html>`;

export class CheckoutValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

class InvalidJsonError extends Error {}

class BodyTooLargeError extends Error {
  constructor(maxBodyBytes) {
    super(`Request body exceeds ${maxBodyBytes} bytes.`);
    this.maxBodyBytes = maxBodyBytes;
  }
}

export function totalOf(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutValidationError('cart must not be empty');
  }

  return items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new CheckoutValidationError('invalid quantity');
    }
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new CheckoutValidationError('invalid price');
    }

    const next = sum + item.quantity * item.unitPrice;
    if (!Number.isSafeInteger(next)) {
      throw new CheckoutValidationError('total exceeds the safe integer range');
    }
    return next;
  }, 0);
}

export function createCheckout({
  capture = async () => 'pay-1',
  save = async () => undefined,
} = {}) {
  return async function checkout(command, { signal } = {}) {
    signal?.throwIfAborted();

    if (typeof command?.orderId !== 'string' || command.orderId.length === 0) {
      throw new CheckoutValidationError('orderId must not be empty');
    }
    if (typeof command.token !== 'string' || command.token.length === 0) {
      throw new CheckoutValidationError('token must not be empty');
    }

    const total = totalOf(command.items);
    const paymentId = await capture(total, command.token, { signal });
    signal?.throwIfAborted();

    const order = {
      orderId: command.orderId,
      total,
      status: 'CONFIRMED',
      paymentId,
    };
    await save(order, { signal });
    signal?.throwIfAborted();
    return order;
  };
}

function requestTraceId(req) {
  const candidate = req.headers['x-trace-id'];
  return typeof candidate === 'string' && TRACE_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

function writeJson(res, status, contentType, body, traceId) {
  if (res.destroyed || res.writableEnded) return;

  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-trace-id': traceId,
  });
  res.end(JSON.stringify(body));
}

function writeProblem(res, req, traceId, { status, slug, title, detail }) {
  writeJson(
    res,
    status,
    'application/problem+json',
    {
      type: `/problems/${slug}`,
      title,
      status,
      detail,
      instance: req.url,
      traceId,
    },
    traceId,
  );
}

async function readJsonBody(req, maxBodyBytes) {
  const contentLength = Number(req.headers['content-length']);
  if (Number.isSafeInteger(contentLength) && contentLength > maxBodyBytes) {
    req.resume();
    throw new BodyTooLargeError(maxBodyBytes);
  }

  const chunks = [];
  let receivedBytes = 0;
  let tooLarge = false;

  for await (const chunk of req) {
    receivedBytes += chunk.length;
    if (receivedBytes > maxBodyBytes) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }

  if (tooLarge) throw new BodyTooLargeError(maxBodyBytes);

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InvalidJsonError('Request body must be valid JSON.');
  }
}

function abortable(promise, signal) {
  const operation = Promise.resolve(promise);
  if (signal.aborted) {
    operation.catch(() => {});
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    operation.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      error => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export function createApp({
  checkout = createCheckout(),
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new TypeError('maxBodyBytes must be a positive safe integer');
  }
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new TypeError('requestTimeoutMs must be a positive safe integer');
  }

  return createServer(async (req, res) => {
    const traceId = requestTraceId(req);

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'x-trace-id': traceId,
      });
      res.end(CHECKOUT_PAGE);
      return;
    }

    if (req.method === 'POST' && req.url === '/orders') {
      const clientController = new AbortController();
      const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
      const signal = AbortSignal.any([clientController.signal, timeoutSignal]);
      const onResponseClose = () => {
        if (!res.writableEnded) {
          clientController.abort(
            new DOMException('The client disconnected.', 'AbortError'),
          );
        }
      };
      res.once('close', onResponseClose);

      try {
        const command = await readJsonBody(req, maxBodyBytes);
        const order = await abortable(checkout(command, { signal, traceId }), signal);
        writeJson(res, 201, 'application/json', order, traceId);
      } catch (error) {
        if (clientController.signal.aborted || res.destroyed) return;

        if (timeoutSignal.aborted) {
          writeProblem(res, req, traceId, {
            status: 504,
            slug: 'checkout-timeout',
            title: 'Checkout timed out',
            detail: `Checkout did not complete within ${requestTimeoutMs} ms.`,
          });
        } else if (error instanceof BodyTooLargeError) {
          writeProblem(res, req, traceId, {
            status: 413,
            slug: 'body-too-large',
            title: 'Request body too large',
            detail: error.message,
          });
        } else if (error instanceof InvalidJsonError) {
          writeProblem(res, req, traceId, {
            status: 400,
            slug: 'invalid-json',
            title: 'Invalid JSON',
            detail: error.message,
          });
        } else if (error instanceof CheckoutValidationError) {
          writeProblem(res, req, traceId, {
            status: 422,
            slug: 'invalid-checkout',
            title: 'Invalid checkout',
            detail: error.message,
          });
        } else {
          writeProblem(res, req, traceId, {
            status: 500,
            slug: 'internal-error',
            title: 'Checkout failed',
            detail: 'The checkout could not be completed.',
          });
        }
      } finally {
        res.removeListener('close', onResponseClose);
      }
      return;
    }

    writeProblem(res, req, traceId, {
      status: 404,
      slug: 'not-found',
      title: 'Not found',
      detail: 'The requested resource does not exist.',
    });
  });
}
