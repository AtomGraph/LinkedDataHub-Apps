// Not a scene. Does a parallax pivot carry the facet selection with it? If it does,
// "filter, then pivot" composes into a real question and the scenes should use it.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/products/');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 140)));

const total = async () => (await page.locator('.ldh-view-toolbar .right .count b').first().textContent().catch(() => '?')).trim();
const facetLabels = async () => page.evaluate(() => [...document.querySelectorAll('.ldh-view-toolbar .left .facet button.facet-pill')]
  .map((b) => `${b.querySelector('.pred')?.textContent.trim()}=${b.querySelector('.val')?.textContent.trim()}`));
const steps = async () => page.evaluate(() => [...document.querySelectorAll('.parallax-steps button.parallax-step')]
  .map((b) => b.textContent.replace(/\s+/g, ' ').trim()));

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);
console.log(`unfiltered:            ${await total()}  facets ${JSON.stringify(await facetLabels())}`);

// facet to three categories
await page.locator('.ldh-view-toolbar .left .facet button.facet-pill').nth(2).click();
await page.waitForFunction(() => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'), null, { timeout: 20_000 }).catch(() => {});
await sleep(800);
for (const want of ['Beverages', 'Condiments', 'Seafood']) {
  const o = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').filter({ hasText: want }).first();
  if (await o.count()) { await o.click(); await sleep(2000); }
}
await page.keyboard.press('Escape');
await sleep(1200);
console.log(`after facet (3 cats):  ${await total()}  facets ${JSON.stringify(await facetLabels())}`);

// pivot while filtered
await page.locator('details.ldh-pivot-bar summary').first().click();
await sleep(1000);
const pills = page.locator('.ldh-pivot-pill:visible');
const names = await pills.allTextContents();
console.log(`pivot options:         ${JSON.stringify(names.map((s) => s.replace(/\s+/g, ' ').trim()))}`);

const provider = pills.filter({ hasText: 'Provider' }).first();
const chosen = (await provider.count()) ? provider : pills.first();
const chosenName = (await chosen.textContent()).replace(/\s+/g, ' ').trim();
await chosen.click();
await sleep(4000);

console.log(`\nafter pivot to ${chosenName}:`);
console.log(`  results:             ${await total()}`);
console.log(`  parallax steps:      ${JSON.stringify(await steps())}`);
console.log(`  facets now offered:  ${JSON.stringify(await facetLabels())}`);

// Does the pivoted view still carry the original filter? Compare against pivoting
// from an unfiltered view.
const page2 = await context.newPage();
await page2.goto(target, { waitUntil: 'load' });
await page2.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);
await page2.locator('details.ldh-pivot-bar summary').first().click();
await sleep(1000);
const p2 = page2.locator('.ldh-pivot-pill:visible').filter({ hasText: chosenName.includes('Provider') ? 'Provider' : '' }).first();
await p2.click();
await sleep(4000);
console.log(`\nsame pivot WITHOUT the facet: ${(await page2.locator('.ldh-view-toolbar .right .count b').first().textContent().catch(() => '?')).trim()} results`);

await context.close();
await browser.close();
