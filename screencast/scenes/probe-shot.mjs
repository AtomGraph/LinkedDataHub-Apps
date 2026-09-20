// Read-only: a dark screenshot of a path, for looking at what a page holds today.
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
const { base, identity } = await resolve('/');
const paths = (process.argv.find((a) => a.startsWith('--paths=')) ?? '--paths=/').slice(8).split(',');
const out = (process.argv.find((a) => a.startsWith('--out=')) ?? '--out=.').slice(6);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, ...(identity ? { clientCertificates: identity } : {}) });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await ctx.newPage();
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/shot${p.replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: true });
}
await browser.close();
