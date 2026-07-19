import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { listen } from '../helpers.js';

const ASSETS = [
  ['/assets/checkout.css', 'text/css; charset=utf-8'],
  ['/assets/checkout-panel.js', 'text/javascript; charset=utf-8'],
  ['/assets/order-client.js', 'text/javascript; charset=utf-8'],
];

test('[integration/real-http] checkout page loads the production component assets', async t => {
  const app = await listen(createApp());
  t.after(app.close);

  const page = await fetch(`${app.baseUrl}/`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /<checkout-panel><\/checkout-panel>/);
  assert.match(html, /src="\/assets\/checkout-panel\.js"/);
  assert.match(html, /href="\/assets\/checkout\.css"/);

  for (const [path, contentType] of ASSETS) {
    const response = await fetch(`${app.baseUrl}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('content-type'), contentType, path);
    assert.notEqual(await response.text(), '', path);
  }
});
