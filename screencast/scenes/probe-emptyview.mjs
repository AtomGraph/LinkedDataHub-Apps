// Read-only: does a showWhenEmpty=false inverse view hide when it has no rows?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-emptyview', target: base + '/territories/72716/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const p of ['/territories/72716/', '/territories/01581/']) {
      await page.goto(base + p, { waitUntil: 'load' });
      await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }).catch(() => {});
      await sleep(9000);
      const v = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block[data-for-class]')].map((b) => ({ title: b.querySelector('h2,h3,.ldh-block-title')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40), count: b.querySelector('.ldh-view-toolbar .count b')?.textContent?.trim() ?? null, hidden: b.hidden || getComputedStyle(b).display === 'none', body: (b.querySelector('.ldh-block-body')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) })));
      console.log(`  ${p}:`, JSON.stringify(v));
    }
  } });
