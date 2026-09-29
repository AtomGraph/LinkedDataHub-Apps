// Read-only: which derived views do these pages render, and how many?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const PAGES = ['/categories/1/', '/territories/72716/', '/employees/2/', '/employees/5/'];
await runScene({ id: 'probe-views', target: base + PAGES[0], identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: 'load' });
      await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }).catch(() => {});
      await sleep(7000);
      const views = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block[data-for-class]')].map((b) => ({
        title: b.querySelector('h2, h3, .ldh-block-title')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
        count: b.querySelector('.ldh-view-toolbar .count b')?.textContent?.trim() ?? null,
        create: !!b.querySelector('button.add-instance'),
      })));
      console.log(`  ${p}: ${views.length} derived view(s)`, JSON.stringify(views));
    }
  } });
