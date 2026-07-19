import { createServer } from 'node:http';
import { CHECKOUT_PAGE } from './checkout-page.js';
import {
  CheckoutValidationError,
  createCheckout,
  isValidOrderId,
} from './checkout.js';
import {
  abortable,
  BodyTooLargeError,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_REQUEST_TIMEOUT_MS,
  InvalidJsonError,
  readJsonBody,
  requestTraceId,
  writeEmpty,
  writeJson,
  writeProblem,
} from './http-support.js';
import { createInMemoryOrderStore } from './order-store.js';

export {
  CheckoutValidationError,
  createCheckout,
  isValidOrderId,
  totalOf,
} from './checkout.js';
export { createInMemoryOrderStore } from './order-store.js';

function writeOrderNotFound(res, req, traceId) {
  writeProblem(res, req, traceId, {
    status: 404,
    slug: 'order-not-found',
    title: 'Order not found',
    detail: 'The requested order does not exist.',
  });
}

export function createApp({
  checkout,
  orderStore = createInMemoryOrderStore(),
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new TypeError('maxBodyBytes must be a positive safe integer');
  }
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new TypeError('requestTimeoutMs must be a positive safe integer');
  }
  if (
    typeof orderStore?.save !== 'function'
    || typeof orderStore.find !== 'function'
    || typeof orderStore.delete !== 'function'
  ) {
    throw new TypeError('orderStore must implement save, find, and delete');
  }
  const checkoutOrder = checkout ?? createCheckout({ save: orderStore.save });

  return createServer(async (req, res) => {
    const traceId = requestTraceId(req);
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'x-trace-id': traceId,
      });
      res.end(CHECKOUT_PAGE);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/orders') {
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
        const order = await abortable(
          checkoutOrder(command, { signal, traceId }),
          signal,
        );
        writeJson(
          res,
          201,
          'application/json',
          order,
          traceId,
          { location: `/orders/${encodeURIComponent(order.orderId)}` },
        );
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

    const orderPath = /^\/orders\/([^/]+)$/.exec(url.pathname);
    if (orderPath && (req.method === 'GET' || req.method === 'DELETE')) {
      let orderId;
      try {
        orderId = decodeURIComponent(orderPath[1]);
      } catch {
        orderId = '';
      }
      const order = isValidOrderId(orderId)
        ? await orderStore.find(orderId)
        : undefined;

      if (order === undefined) {
        writeOrderNotFound(res, req, traceId);
        return;
      }

      if (req.method === 'GET') {
        writeJson(res, 200, 'application/json', order, traceId);
      } else {
        await orderStore.delete(orderId);
        writeEmpty(res, 204, traceId);
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
