import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(
  new URL('../../src/checkout.css', import.meta.url),
  'utf8',
);

const ROOT_TOKEN_NAMES = [
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleBody(selector) {
  const match = new RegExp(
    `${escapeRegExp(selector)}\\s*\\{([^}]+)\\}`,
  ).exec(css);
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

function assertDeclaration(selector, property, expectedValue) {
  assert.match(
    ruleBody(selector),
    new RegExp(
      `${escapeRegExp(property)}:\\s*`
      + `${escapeRegExp(expectedValue)}\\s*;`,
    ),
    `${selector} must set ${property} from ${expectedValue}`,
  );
}

test('[component/source-css] shared custom properties own typography and layout', () => {
  const root = ruleBody(':root');
  for (const token of ROOT_TOKEN_NAMES) {
    assert.match(root, new RegExp(`${escapeRegExp(token)}:`), token);
  }
  const nonRootCss = css.replace(/:root\s*\{[^}]+\}/, '');
  assert.doesNotMatch(
    nonRootCss,
    /#[\da-f]{3,8}\b/i,
    'raw colors must stay in :root custom properties',
  );
  for (const match of nonRootCss.matchAll(/font-size:\s*([^;]+);/g)) {
    assert.match(
      match[1],
      /^var\(--font-size-/,
      `font-size must reference a shared token: ${match[1]}`,
    );
  }

  const declarations = [
    ['body', 'font-family', 'var(--font-family-body)'],
    ['body', 'font-size', 'var(--font-size-body)'],
    ['body', 'line-height', 'var(--line-height-body)'],
    ['checkout-panel main', 'width', 'min(100%, var(--content-max-width))'],
    [
      'checkout-panel main',
      'border',
      'var(--border-width) solid var(--color-border)',
    ],
    ['checkout-panel h1', 'font-size', 'var(--font-size-title)'],
    ['checkout-panel h1', 'line-height', 'var(--line-height-title)'],
    [
      'checkout-panel button',
      'padding',
      'var(--space-2) var(--space-3)',
    ],
    [
      'checkout-panel button',
      'border-radius',
      'var(--radius-control)',
    ],
    [
      'checkout-panel button:disabled',
      'opacity',
      'var(--opacity-disabled)',
    ],
    [
      'checkout-panel :is([role="status"], [role="alert"])',
      'font-size',
      'var(--font-size-status)',
    ],
    [
      'checkout-panel :is([role="status"], [role="alert"])',
      'min-height',
      'var(--status-min-height)',
    ],
    [
      'checkout-panel [role="status"][data-phase="confirmed"]',
      'color',
      'var(--color-success)',
    ],
    ['checkout-panel [role="alert"]', 'color', 'var(--color-error)'],
  ];

  for (const declaration of declarations) {
    assertDeclaration(...declaration);
  }
});
