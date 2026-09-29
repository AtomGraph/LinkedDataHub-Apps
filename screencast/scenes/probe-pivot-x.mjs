// Not a scene. Confirms whether the × inside a parallax step chip throws, versus
// clicking the chip body, which does not. Both are button.facet-pill; only one has
// a div.facet ancestor.
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

for (const mode of ['chip body', 'the × glyph']) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));

  await page.goto(target, { waitUntil: 'load' });
  await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
  await sleep(2500);
  await page.locator('details.ldh-pivot-bar summary').first().click();
  await sleep(1000);
  await page.locator('.ldh-pivot-pill:visible').first().click();
  await sleep(3500);

  const chip = page.locator('.parallax-steps button.parallax-step').last();
  console.log(`\nancestors of the chip: div.facet present? ${await chip.evaluate((e) => !!e.closest('div.facet'))}`);

  errors.length = 0;
  const targetEl = mode === 'chip body' ? chip : chip.locator('span.x');
  await targetEl.click();
  await sleep(3000);

  console.log(`clicking ${mode}:`);
  console.log(`  total now: ${await page.locator('.ldh-view-toolbar .right .count b').first().textContent().catch(() => '?')}`);
  console.log(`  page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  await page.close();
}

await context.close();
await browser.close();
