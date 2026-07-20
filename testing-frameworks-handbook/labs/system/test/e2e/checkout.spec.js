import { test, expect } from '@playwright/test';

test('[system/browser-http] customer completes checkout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buy two books' }).click();
  await expect(page.getByRole('status')).toHaveText('CONFIRMED: 1200');
});

test('[system/browser-http] customer sees a checkout failure', async ({ page }) => {
  await page.route('**/orders', async route => {
    await route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: 'https://example.test/problems/payment-unavailable',
        title: 'Payment unavailable',
        status: 503,
        detail: 'The payment service is unavailable.',
        instance: '/orders',
        traceId: 'e2e-payment-unavailable',
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Buy two books' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Order API returned HTTP 503',
  );
});
