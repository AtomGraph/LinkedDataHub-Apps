// Read-only: does the app follow prefers-color-scheme? Loads one page under each scheme and
// prints the media query's answer and the body's background. Answered yes on 2026-09-19 —
// which is why every take in the dark cut is recorded with SCHEME=dark.
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
const { base, identity } = await resolve('/');
const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, ignoreHTTPSErrors: true, ...(identity ? { clientCertificates: identity } : {}) });
  await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
  const page = await ctx.newPage();
  await page.goto(base + '/customers/GOURL/', { waitUntil: 'load' });
  await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30000 }).catch(() => {});
  console.log(scheme, await page.evaluate(() => [matchMedia('(prefers-color-scheme: dark)').matches, getComputedStyle(document.body).backgroundColor, document.documentElement.dataset.theme ?? null, document.documentElement.className]));
  await ctx.close();
}
await browser.close();
