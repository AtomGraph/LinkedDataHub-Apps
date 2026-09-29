// Not a scene. The tab strip: how a tab is identified and switched to.
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
await sleep(3000);
await page.locator('button.btn-apps').first().click(); await sleep(1200);
await page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first().click();
await page.waitForLoadState('load').catch(() => {}); await sleep(5000);

console.log('tab strip:', await page.evaluate(() => {
  const tabs = [...document.querySelectorAll('[class*="tab"]')].filter((e) => e.offsetParent !== null);
  return JSON.stringify(tabs.slice(0, 10).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} — "${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 24)}"`), null, 1);
}));

// Switch back by clicking the first tab's label.
const first = page.locator('[class*="tab"]:visible').filter({ hasText: 'Categories' }).first();
console.log('found Categories tab:', await first.count());
if (await first.count()) {
  await first.click();
  await sleep(3000);
  console.log('url after clicking it:', page.url().slice(0, 90));
  console.log('active pane heading:', await page.evaluate(() => {
    const p = document.querySelector('.ldh-pane.is-active');
    return p ? (p.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)) : 'none';
  }));
}
await context.close(); await browser.close();
