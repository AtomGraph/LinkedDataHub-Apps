// Read-only: what the demo looks like in the dark scheme, on four kinds of page.
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const OUT = '/private/tmp/claude-501/-Users-martynas-WebRoot-LinkedDataHub/5542c912-918c-4be9-8864-ed41b61b33fa/scratchpad/dark';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await ctx.newPage();
for (const [p, name] of [['/territories/', 'map'], ['/employees/', 'grid'], ['/orders/10423/?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode'), 'graph'], ['/regions/4/', 'record'], ['/categories/', 'cats']]) {
  await page.goto(base + p, { waitUntil: 'load' }).catch(() => {});
  await page.waitForSelector('.ldh-pane.is-active .ldh-block, canvas', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  ' + name, await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
}
await browser.close();
