// Not a scene. Is there any UI path to a saved query — to create one, or to edit
// the one behind an existing view?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/products/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await sleep(4000);

// The Create menu is mode-gated: ContentMode offers only the two block types.
// Switch to Properties first to see the ontology's classes.
import { switchDocumentMode } from '../lib/blocks.mjs';
const plain = { click: async (l) => l.click() };
console.log('in ContentMode, Create offers:');
await page.locator('button.drop-toggle').filter({ hasText: 'Create' }).first().click();
await sleep(1200);
console.log(await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.add-constructor')].filter((e) => e.offsetParent !== null)
    .map((e) => `${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 28)} → ${e.dataset.forClass ?? ''}`), null, 1)));
await page.keyboard.press('Escape'); await sleep(800);

await switchDocumentMode(page, plain, 'read-mode');
await sleep(3000);
console.log('\nin Properties (ReadMode), Create offers:');
await page.locator('button.drop-toggle').filter({ hasText: 'Create' }).first().click();
await sleep(1500);
console.log(await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.add-constructor')].filter((e) => e.offsetParent !== null)
    .map((e) => `${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)} → ${(e.dataset.forClass ?? '').replace(/^https?:\/\/[^#]*[#\/]/, '')}`), null, 1)));
await page.keyboard.press('Escape'); await sleep(600);

const chip = page.locator('.ldh-type-chip').filter({ hasText: 'View' }).first();
console.log('\nView chip present:', await chip.count(), await chip.getAttribute('href').catch(() => ''));
if (await chip.count()) {
  await chip.click();
  await page.waitForLoadState('load').catch(() => {});
  await sleep(5000);
  console.log('view resource page:', page.url().slice(0, 100));
  console.log(await page.evaluate(() => JSON.stringify({
    yasqe: document.querySelectorAll('.yasqe, .CodeMirror').length,
    queryText: [...document.querySelectorAll('pre, code, textarea')].filter((e) => /SELECT|WHERE/i.test(e.textContent)).length,
    links: [...document.querySelectorAll('.ldh-pane.is-active a')].filter((a) => /quer/i.test(a.textContent + a.href))
      .map((a) => `${a.textContent.replace(/\s+/g,' ').trim().slice(0,26)} → ${a.getAttribute('href')?.slice(0, 70)}`).slice(0, 5),
  }, null, 1)));
}
await context.close(); await browser.close();
