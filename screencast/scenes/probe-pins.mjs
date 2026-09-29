// Not a scene. Runs the pin detector and paints a dot at every coordinate it
// returns, so a screenshot shows immediately whether they land on the pins.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { findMarkers } from '../lib/map.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/territories/';
const { base, target, identity } = await resolve(where);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2,
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2000);
await page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first().click();
await sleep(600);
await page.locator('.modes-pop.view-mode-list button.mi.map-mode').first().click();
await sleep(8000);

const found = await findMarkers(page);
console.log('detector says:', JSON.stringify({ error: found.error, clusters: found.clusters, scale: found.scale, n: found.markers?.length }));
console.log('first five:', JSON.stringify((found.markers ?? []).slice(0, 5).map((m) => ({ x: Math.round(m.x), y: Math.round(m.y), w: m.weight }))));

// Paint them.
await page.evaluate((markers) => {
  for (const m of markers) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${m.x}px;top:${m.y}px;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#ff1744;box-shadow:0 0 0 2px #fff;z-index:2147483647;pointer-events:none`;
    document.body.appendChild(d);
  }
}, found.markers ?? []);
await page.screenshot({ path: 'shots/probe-pins.png' });
console.log('→ shots/probe-pins.png');

// And try clicking each, reporting which works.
for (const [i, m] of (found.markers ?? []).slice(0, 8).entries()) {
  await page.mouse.click(m.x, m.y);
  await sleep(900);
  const n = await page.locator('.ol-overlay-container .ac-modal-body').count();
  console.log(`  [${i}] ${Math.round(m.x)},${Math.round(m.y)} w=${m.weight} → ${n ? 'OPENED' : 'nothing'}`);
  if (n) break;
}

await context.close();
await browser.close();
