import { readFileSync } from 'node:fs';

const STATIC_ASSET_CONTENT_TYPES = Object.freeze({
  'checkout.css': 'text/css; charset=utf-8',
  'checkout-command.js': 'text/javascript; charset=utf-8',
  'checkout-panel.js': 'text/javascript; charset=utf-8',
  'order-client.js': 'text/javascript; charset=utf-8',
});

const STATIC_ASSETS = new Map(
  Object.entries(STATIC_ASSET_CONTENT_TYPES).map(
    ([fileName, contentType]) => [
      `/assets/${fileName}`,
      Object.freeze({
        contentType,
        body: readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8'),
      }),
    ],
  ),
);

export function writeStaticAsset(res, pathname, traceId) {
  const asset = STATIC_ASSETS.get(pathname);
  if (asset === undefined) return false;

  res.writeHead(200, {
    'content-type': asset.contentType,
    'x-trace-id': traceId,
  });
  res.end(asset.body);
  return true;
}
