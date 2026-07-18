import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

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
  corePackage.version
]);

if (versions.size !== 1) {
  throw new Error(`Playwright package versions differ: ${[...versions].join(', ')}`);
}

const chromiumDescriptor = browsers.browsers.find(browser => browser.name === 'chromium');
if (!chromiumDescriptor?.revision) {
  throw new Error('playwright-core/browsers.json has no Chromium revision');
}

const executable = chromium.executablePath();
if (!existsSync(executable)) {
  throw new Error(`Chromium ${chromiumDescriptor.revision} is not installed at ${executable}`);
}

console.log(
  `Playwright ${declared} -> Chromium revision ${chromiumDescriptor.revision} (${executable})`
);
