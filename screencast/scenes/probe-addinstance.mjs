// Not a scene. Which view blocks carry the add-instance button, and bound to what.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { identity, base } = opts;
const PAGES = ['/employees/', '/territories/', '/categories/', '/c8dded1e-1751-48d2-bd59-b2db2267ab4d/'];
await runScene({
  id: 'probe-addinstance', target: base + '/', identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'load' });
      await page.waitForSelector('.ldh-view-toolbar', { timeout: 25_000 }).catch(() => {});
      await sleep(3500);
      console.log(`  ${p}:`, await page.evaluate(() => JSON.stringify(
        [...document.querySelectorAll('.ldh-pane.is-active button.add-instance')].map((b) => ({
          visible: b.offsetParent !== null,
          forClass: b.dataset.forClass, container: b.dataset.container,
          view: b.closest('[about]')?.getAttribute('about')?.split('/').pop(),
        })))));
    }
  },
}, {});
