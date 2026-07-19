export const CHECKOUT_PAGE = `<!doctype html>
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
