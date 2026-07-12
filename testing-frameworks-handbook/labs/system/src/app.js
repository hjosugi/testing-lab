import { createServer } from 'node:http';

export function totalOf(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('cart must not be empty');
  return items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('invalid quantity');
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) throw new Error('invalid price');
    return sum + item.quantity * item.unitPrice;
  }, 0);
}

export function createApp({ capture = async () => 'pay-1', save = async () => undefined } = {}) {
  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="en"><head><title>Checkout lab</title></head>
        <body><main><h1>Checkout</h1><button id="buy">Buy two books</button>
        <p id="status" role="status">Ready</p></main><script>
        document.querySelector('#buy').addEventListener('click', async () => {
          const response = await fetch('/orders', { method: 'POST', headers: {'content-type':'application/json'},
            body: JSON.stringify({orderId:'o-1', token:'t-1', items:[{sku:'book',quantity:2,unitPrice:600}]}) });
          const order = await response.json();
          document.querySelector('#status').textContent = order.status + ': ' + order.total;
        });</script></body></html>`);
      return;
    }
    if (req.method === 'POST' && req.url === '/orders') {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const command = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const total = totalOf(command.items);
        const paymentId = await capture(total, command.token);
        const order = { orderId: command.orderId, total, status: 'CONFIRMED', paymentId };
        await save(order);
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end(JSON.stringify(order));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/problem+json' });
        res.end(JSON.stringify({ title: 'Checkout failed', detail: error.message }));
      }
      return;
    }
    res.writeHead(404).end();
  });
}

