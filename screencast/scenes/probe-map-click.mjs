// Not a scene. Clicks precisely on a rendered pin and diffs the DOM, to learn what
// an OpenLayers marker click actually produces.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/territories/');

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

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2000);
await page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first().click();
await sleep(600);
await page.locator('.modes-pop.view-mode-list button.mi.map-mode').first().click();
await sleep(8000);

const snapshot = () => page.evaluate(() => document.body.innerHTML.length + '|' +
  [...document.querySelectorAll('div,section,dialog')].map((e) => String(e.className)).join(','));

const before = await snapshot();

// The pins visible in the rendered map, measured off a screenshot at this geometry.
// Absolute page coordinates; the pin tip sits a few px below the circle.
const PINS = [[792, 578], [921, 667], [1021, 647], [1059, 683], [1151, 632]];

for (const [x, y] of PINS) {
  await page.mouse.click(x, y);
  await sleep(1500);
  const after = await snapshot();
  if (after !== before) {
    console.log(`click ${x},${y} CHANGED the DOM`);
    console.log(await page.evaluate(() => {
      // what appeared that looks like an info window?
      const cands = [...document.querySelectorAll('div,dialog')]
        .filter((e) => /popup|overlay|info|modal|ol-/.test(String(e.className)))
        .slice(0, 12)
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} — ${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)}`);
      return JSON.stringify(cands, null, 1);
    }));
    await page.screenshot({ path: 'shots/probe-map-click.png' });
    break;
  }
  console.log(`click ${x},${y} — no change`);
}

await context.close();
await browser.close();
