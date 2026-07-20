import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const BROWSER_TYPES = Object.freeze([
  Object.freeze({ name: 'chromium', browserType: chromium }),
  Object.freeze({ name: 'firefox', browserType: firefox }),
  Object.freeze({ name: 'webkit', browserType: webkit }),
]);

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

const manifest = readJson('../package.json');
const lock = readJson('../package-lock.json');
const testPackage = readJson('../node_modules/@playwright/test/package.json');
const playwrightPackage = readJson('../node_modules/playwright/package.json');
const corePackage = readJson('../node_modules/playwright-core/package.json');
const browsers = readJson('../node_modules/playwright-core/browsers.json');

const declared = manifest.devDependencies['@playwright/test'];
const locked = lock.packages['node_modules/@playwright/test'].version;
const versions = new Set([
  declared,
  locked,
  testPackage.version,
  playwrightPackage.version,
  corePackage.version,
  ...(process.env.PLAYWRIGHT_NIX_DRIVER_VERSION === undefined
    ? []
    : [process.env.PLAYWRIGHT_NIX_DRIVER_VERSION]),
]);

if (versions.size !== 1) {
  throw new Error(`Playwright package versions differ: ${[...versions].join(', ')}`);
}

for (const { name, browserType } of BROWSER_TYPES) {
  const descriptor = browsers.browsers.find(browser => browser.name === name);
  if (!descriptor?.revision) {
    throw new Error(
      `playwright-core/browsers.json has no ${name} revision`,
    );
  }

  const executable = browserType.executablePath();
  if (!existsSync(executable)) {
    throw new Error(
      `${name} ${descriptor.revision} is not installed at ${executable}`,
    );
  }

  console.log(
    `Playwright ${declared} -> ${name} revision`
    + ` ${descriptor.revision} (${executable})`,
  );
}
