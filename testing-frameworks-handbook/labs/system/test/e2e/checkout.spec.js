import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('customer completes the critical checkout journey', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buy two books' }).click();
  await expect(page.getByRole('status')).toHaveText('CONFIRMED: 1200');
});

test('checkout page has no automatically detectable accessibility violation', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

