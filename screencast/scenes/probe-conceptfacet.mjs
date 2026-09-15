// Not a scene. Can the proxied Concepts container be filtered to a named concept,
// and how long does its facet take on 4498 rows?
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
await page.locator('button.btn-apps').first().click(); await sleep(1200);
await page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first().click();
await page.waitForLoadState('load').catch(() => {}); await sleep(5500);
const concepts = page.locator('.ldh-pane.is-active .ldh-block-body a:visible').filter({ hasText: 'Concepts' }).first();
await concepts.click(); await page.waitForLoadState('load').catch(() => {}); await sleep(6000);

console.log('total results:', await page.locator('.ldh-pane.is-active .ldh-view-toolbar .right .count b').first().textContent().catch(() => '?'));
const pills = page.locator('.ldh-pane.is-active .ldh-view-toolbar .left .facet button.facet-pill');
const n = await pills.count();
console.log('facets offered:', n);
for (let i = 0; i < n; i++) console.log(`  [${i}] ${(await pills.nth(i).textContent()).replace(/\s+/g,' ').trim().slice(0,30)} — ${await pills.nth(i).getAttribute('title')}`);

if (n) {
  const t = Date.now();
  await pills.first().click();
  const ok = await page.waitForFunction(() => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'), null, { timeout: 25000 }).then(() => true, () => false);
  console.log(`first facet: ${ok ? `loaded in ${((Date.now()-t)/1000).toFixed(1)}s` : 'TIMED OUT after 25s'}`);
  if (ok) console.log('  values:', await page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').count());
}
await context.close(); await browser.close();
