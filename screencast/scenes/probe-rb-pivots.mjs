// Read-only: which pivot pills Rebrickable's photo views offer, per page. Nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const pages = (process.env.PAGES ?? '/sets/10229-1/,/sets/,/parts/3001/').split(',');
await runScene({ id: 'probe-rb-pivots', target: base + pages[0], identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const p of pages) {
      const url = p.startsWith('http') ? p : base.replace(/\/$/, '') + p;
      await page.goto(url, { waitUntil: 'load' }).catch((e) => console.log('  goto failed', url, e.message));
      await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 40_000 }).catch(() => {});
      await sleep(4000);
      const info = await page.evaluate(() => {
        const views = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].filter((b) => b.querySelector('.ldh-view-toolbar'));
        return views.map((v) => ({ title: v.querySelector('h2, h3, .ldh-bh-title')?.textContent.trim().slice(0, 40), count: v.querySelector('.ldh-view-toolbar .count')?.textContent.trim(), mode: v.querySelector('.ldh-view-toolbar [aria-pressed="true"], .ldh-view-toolbar .is-active')?.textContent.trim().slice(0, 20), imgs: v.querySelectorAll('img').length, pills: [...v.querySelectorAll('.ldh-pivot-pill')].map((p) => p.textContent.trim().replace(/\s+/g, ' ')), barOpen: v.querySelector('details.ldh-pivot-bar')?.open ?? null, h: v.getBoundingClientRect().height }));
      });
      console.log('  page', url, JSON.stringify(info));
      await page.screenshot({ path: process.env.SHOTS + '/rb-' + p.replace(/[^a-z0-9]+/gi, '_') + '.png' }).catch(() => {});
    }
  } });
