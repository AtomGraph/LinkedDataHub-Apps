// Not a scene. The applications menu is how one dataspace reaches another; this
// dumps what it offers and whether switching works.
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
await sleep(4000);

const apps = page.locator('button.btn-apps').first();
console.log('apps button:', await apps.count());
await apps.click();
await sleep(1500);
console.log(await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.ac-menu-item, .ac-menu a')].filter((e) => e.offsetParent !== null)
    .map((e) => `${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)} → ${e.getAttribute('href') ?? '(button)'}`).slice(0, 14), null, 1)));

const unesco = page.locator('.ac-menu-item, .ac-menu a').filter({ hasText: 'UNESCO' }).first();
if (await unesco.count()) {
  await unesco.click();
  await page.waitForLoadState('load').catch(() => {});
  await sleep(5000);
  console.log('after switch:', page.url());
  console.log('title:', await page.title());
}
await context.close(); await browser.close();
