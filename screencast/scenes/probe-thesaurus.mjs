// Not a scene. Once the apps menu proxies the thesaurus into our chrome, how does
// one reach an actual concept, and does it carry a copy-URI control?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/categories/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await sleep(3500);

await page.locator('button.btn-apps').first().click();
await sleep(1200);
await page.locator('.ac-menu-item, .ac-menu a').filter({ hasText: 'UNESCO' }).first().click();
await page.waitForLoadState('load').catch(() => {});
await sleep(6000);
console.log('proxied root:', page.url().slice(0, 110));

console.log('links on the proxied root:', await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.ldh-block-body a[href*="uri="], .ldh-block-body a')]
    .filter((a) => a.offsetParent !== null)
    .slice(0, 10)
    .map((a) => `${a.textContent.replace(/\s+/g, ' ').trim().slice(0, 34)} → ${(a.getAttribute('href') ?? '').slice(0, 90)}`), null, 1)));

const first = page.locator('.ldh-block-body a').first();
if (await first.count()) {
  console.log('following:', (await first.textContent()).trim().slice(0, 40));
  await first.click();
  await page.waitForLoadState('load').catch(() => {});
  await sleep(6000);
  console.log('now at:', page.url().slice(0, 130));
  console.log('title:', await page.title());
  console.log('copy-uri controls:', await page.locator('.btn-copy-uri').count());
}
await page.screenshot({ path: 'shots/probe-thesaurus.png' });
await context.close(); await browser.close();
