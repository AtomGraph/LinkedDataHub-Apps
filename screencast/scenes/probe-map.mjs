// Not a scene. Switches a view to Map mode and reports what the markers are, so a
// scene can click one and open its info window.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/territories/';
const { base, target, identity } = await resolve(where);

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
await sleep(2500);

await page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first().click();
await sleep(700);
const mapItem = page.locator('.modes-pop.view-mode-list button.mi.map-mode').first();
console.log('map mode offered:', await mapItem.count() > 0);
if (!(await mapItem.count())) process.exit(0);
await mapItem.click();
await sleep(7000);

console.log(await page.evaluate(() => {
  const candidates = {
    'canvas': document.querySelectorAll('canvas').length,
    '.ol-viewport': document.querySelectorAll('.ol-viewport').length,
    '.ol-overlay-container': document.querySelectorAll('.ol-overlay-container').length,
    'svg image': document.querySelectorAll('svg image').length,
    '[class*=marker]': document.querySelectorAll('[class*=marker]').length,
    '.ldh-map, [class*=map]': document.querySelectorAll('.ldh-map, [class*=map]').length,
  };
  const mapEl = document.querySelector('.ol-viewport, [class*=map]');
  return JSON.stringify({
    candidates,
    mapBox: mapEl ? `${Math.round(mapEl.getBoundingClientRect().width)}x${Math.round(mapEl.getBoundingClientRect().height)}` : null,
    mapClasses: mapEl?.className ?? null,
  }, null, 1);
}));

// Can the OpenLayers map be reached from the DOM? If it can, a scene can compute a
// marker's exact pixel instead of guessing where to click.
console.log('\nlooking for the map object:');
console.log(await page.evaluate(() => {
  const found = [];
  for (const el of document.querySelectorAll('div')) {
    for (const k of Object.keys(el)) {
      if (/^(map|overlay|ol)/i.test(k)) found.push(`${el.className || el.tagName}.${k}`);
    }
  }
  return JSON.stringify({ expandos: found.slice(0, 10), onWindow: Object.keys(window).filter((k) => /^(ol|map|LinkedDataHub)/.test(k)).slice(0, 10) }, null, 1);
}));

// Fallback that needs no map object: click candidate points until an info window
// appears. Markers are canvas-drawn, so this is a search, not a lookup.
const vp = page.locator('.ol-viewport').first();
const box = await vp.boundingBox();
console.log(`\nviewport box: ${box ? `${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}` : 'none'}`);
if (box) {
  const infoSel = '.ol-overlay-container, .ac-modal, [class*="info"], .ol-popup';
  outer: for (let gx = 1; gx <= 6; gx++) {
    for (let gy = 1; gy <= 3; gy++) {
      const x = box.x + (box.width * gx) / 7;
      const y = box.y + (box.height * gy) / 4;
      await page.mouse.click(x, y);
      await sleep(900);
      const n = await page.locator(infoSel).count();
      if (n) {
        console.log(`  info window after clicking ${Math.round(x)},${Math.round(y)} → ${n} match(es) for ${infoSel}`);
        console.log('  ', (await page.locator(infoSel).first().textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160));
        await page.screenshot({ path: 'shots/probe-map-info.png' });
        break outer;
      }
    }
  }
}

await page.screenshot({ path: 'shots/probe-map.png' });
console.log('screenshot → shots/probe-map.png');

await context.close();
await browser.close();
