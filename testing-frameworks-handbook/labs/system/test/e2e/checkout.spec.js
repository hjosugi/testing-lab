import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('[system/browser-http] customer completes the critical checkout journey', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buy two books' }).click();
  await expect(page.getByRole('status')).toHaveText('CONFIRMED: 1200');
});

test('[system/browser-dom] checkout page has no automatically detectable accessibility violation', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('[system/browser-css] shared custom properties drive typography and layout', async ({ page }) => {
  await page.goto('/');

  const styles = await page.evaluate(() => {
    const rules = Array.from(document.styleSheets)
      .flatMap(styleSheet => Array.from(styleSheet.cssRules))
      .filter(rule => rule instanceof CSSStyleRule);
    const styleFor = selector => rules.find(rule => rule.selectorText === selector)?.style;
    const selectors = {
      main: 'checkout-panel main',
      title: 'checkout-panel h1',
      button: 'checkout-panel button',
      disabledButton: 'checkout-panel button:disabled',
      status: 'checkout-panel :is([role="status"], [role="alert"])',
      confirmedStatus:
        'checkout-panel [role="status"][data-phase="confirmed"]',
      errorStatus: 'checkout-panel [role="alert"]',
    };
    const rootStyle = styleFor(':root');
    const requiredTokens = [
      '--font-family-body',
      '--font-size-body',
      '--font-size-title',
      '--font-size-status',
      '--line-height-body',
      '--line-height-title',
      '--space-2',
      '--space-3',
      '--space-4',
      '--content-max-width',
      '--status-min-height',
      '--border-width',
      '--radius-control',
      '--opacity-disabled',
      '--color-background',
      '--color-surface',
      '--color-text',
      '--color-accent',
      '--color-accent-contrast',
      '--color-border',
      '--color-success',
      '--color-error',
    ];

    return {
      missingTokens: requiredTokens.filter(
        token => rootStyle?.getPropertyValue(token).trim() === '',
      ),
      declarations: {
        bodyFontFamily: styleFor('body')?.getPropertyValue('font-family'),
        bodyFontSize: styleFor('body')?.getPropertyValue('font-size'),
        bodyLineHeight: styleFor('body')?.getPropertyValue('line-height'),
        mainWidth: styleFor(selectors.main)?.getPropertyValue('width'),
        mainBorder: styleFor(selectors.main)?.getPropertyValue('border'),
        titleFontSize: styleFor(selectors.title)?.getPropertyValue('font-size'),
        titleLineHeight: styleFor(selectors.title)
          ?.getPropertyValue('line-height'),
        buttonPadding: styleFor(selectors.button)?.getPropertyValue('padding'),
        buttonRadius: styleFor(selectors.button)
          ?.getPropertyValue('border-radius'),
        disabledOpacity: styleFor(selectors.disabledButton)
          ?.getPropertyValue('opacity'),
        statusFontSize: styleFor(selectors.status)
          ?.getPropertyValue('font-size'),
        statusMinHeight: styleFor(selectors.status)
          ?.getPropertyValue('min-height'),
        confirmedColor: styleFor(selectors.confirmedStatus)
          ?.getPropertyValue('color'),
        errorColor: styleFor(selectors.errorStatus)
          ?.getPropertyValue('color'),
      },
    };
  });

  expect(styles.missingTokens).toEqual([]);
  expect(styles.declarations).toEqual({
    bodyFontFamily: 'var(--font-family-body)',
    bodyFontSize: 'var(--font-size-body)',
    bodyLineHeight: 'var(--line-height-body)',
    mainWidth: 'min(100%, var(--content-max-width))',
    mainBorder: 'var(--border-width) solid var(--color-border)',
    titleFontSize: 'var(--font-size-title)',
    titleLineHeight: 'var(--line-height-title)',
    buttonPadding: 'var(--space-2) var(--space-3)',
    buttonRadius: 'var(--radius-control)',
    disabledOpacity: 'var(--opacity-disabled)',
    statusFontSize: 'var(--font-size-status)',
    statusMinHeight: 'var(--status-min-height)',
    confirmedColor: 'var(--color-success)',
    errorColor: 'var(--color-error)',
  });
});
