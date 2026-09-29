// Not a scene. Inside a proxied dataspace, does the drawer search find that
// dataspace's resources, or the local one's?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { openTree } from '../lib/nav.mjs';

const { base, target, identity } = await resolve('/categories/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
const plain = { moveTo: async () => {}, click: async (l) => l.click() };

await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
await page.locator('button.btn-apps').first().click(); await sleep(1200);
await page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first().click();
await page.waitForLoadState('load').catch(() => {}); await sleep(5500);
console.log('in the thesaurus:', page.url().includes('unesco') ? 'yes (proxied)' : page.url().slice(0, 60));

await openTree(page, plain);
const box = page.locator('.sb-search input[name="q"]').first();
console.log('search box visible:', await box.isVisible().catch(() => false));
if (await box.isVisible().catch(() => false)) {
  await box.click();
  await box.pressSequentially('Beverages', { delay: 60 });
  await sleep(3500);
  console.log('results:', await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.typeahead a, .typeahead li, .ac-menu-item')]
      .filter((e) => e.offsetParent !== null).slice(0, 6)
      .map((a) => `${a.textContent.replace(/\s+/g,' ').trim().slice(0,32)} → ${(a.getAttribute('href') ?? '').slice(0, 78)}`), null, 1)));
}
await context.close(); await browser.close();
