import { defineConfig, devices } from '@playwright/test';

const flakeMetricsPath = process.env.PLAYWRIGHT_FLAKE_METRICS_PATH
  ?? 'test-results/flake-metrics.json';
const htmlOutputFolder = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR
  ?? 'playwright-report';
const isStabilityRun = process.env.PLAYWRIGHT_STABILITY === '1';
const reporters = [
  [isStabilityRun ? 'dot' : 'list'],
  ['./scripts/flake-reporter.js', { outputFile: flakeMetricsPath }],
];

if (!isStabilityRun) {
  reporters.push(['html', { open: 'never', outputFolder: htmlOutputFolder }]);
}

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: reporters,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-first-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-first-failure',
  },
  webServer: {
    command: 'PORT=3100 node src/server.js',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
  },
});
