import { randomUUID } from 'node:crypto';

export const DEFAULT_MAX_BODY_BYTES = 16 * 1024;
export const DEFAULT_REQUEST_TIMEOUT_MS = 1_000;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class InvalidJsonError extends Error {}

export class BodyTooLargeError extends Error {
  constructor(maxBodyBytes) {
    super(`Request body exceeds ${maxBodyBytes} bytes.`);
    this.maxBodyBytes = maxBodyBytes;
  }
}

export function requestTraceId(req) {
  const candidate = req.headers['x-trace-id'];
  return typeof candidate === 'string' && TRACE_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

export function writeJson(
  res,
  status,
  contentType,
  body,
  traceId,
  headers = {},
) {
  if (res.destroyed || res.writableEnded) return;

  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-trace-id': traceId,
    ...headers,
  });
  res.end(JSON.stringify(body));
}

export function writeEmpty(res, status, traceId) {
  if (res.destroyed || res.writableEnded) return;

  res.writeHead(status, {
    'cache-control': 'no-store',
    'x-trace-id': traceId,
  });
  res.end();
}

export function writeProblem(
  res,
  req,
  traceId,
  { status, slug, title, detail },
) {
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

export async function readJsonBody(req, maxBodyBytes) {
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

export function abortable(promise, signal) {
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
