import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { findMarkers, openMarker } from '../lib/map.mjs';

const { target, identity, ...a } = await resolve('/territories/');

await runScene({
  id: 'probe-pinpop', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, target }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(3000);
    const found = await findMarkers(page);
    await openMarker(page, cursor, found.markers ?? []);
    await sleep(1500);
    console.log(await page.evaluate(() => {
      const pop = document.querySelector('.ol-overlay-container');
      if (!pop) return '  (no popup)';
      return [...pop.querySelectorAll('button, a')].map((e, i) =>
        `  [${i}] <${e.tagName.toLowerCase()}> class="${e.className}" title="${e.getAttribute('title') ?? ''}" text="${e.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)}"`).join('\n');
    }));

    const before = await page.evaluate(() => document.body.innerHTML.length);
    const links = page.locator('.ol-overlay-container button.tb-links').first();
    console.log('  tb-links count:', await links.count());
    await cursor.click(links);
    await sleep(3500);
    console.log(await page.evaluate((before) => {
      const after = document.body.innerHTML.length;
      const pops = [...document.querySelectorAll('[class*="pop"], [role="dialog"], .modal, .ac-modal')]
        .filter((e) => e.offsetParent !== null)
        .map((e, i) => `  pop[${i}] <${e.tagName.toLowerCase()}> class="${e.className}" text="${e.innerText.replace(/\s+/g, ' ').trim().slice(0, 90)}"`);
      return `  html ${before} -> ${after}\n` + (pops.join('\n') || '  (no visible popover)');
    }, before));
  },
}, {});
