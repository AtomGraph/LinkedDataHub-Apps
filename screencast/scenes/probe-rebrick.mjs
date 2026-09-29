// Read-only: what the Rebrickable dataspace looks like on its strongest pages.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const OUT = '/private/tmp/claude-501/-Users-martynas-WebRoot-LinkedDataHub/5542c912-918c-4be9-8864-ed41b61b33fa/scratchpad/rb';
await runScene({ id: 'probe-rebrick', target: base + '/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const [p, name] of [['/', 'root'], ['/sets/', 'sets'], ['/taxonomies/themes/', 'themes'], ['/taxonomies/colors/', 'colors'], ['/sets/10229-1/', 'set'], ['/parts/3005/', 'part']]) {
      const t0 = Date.now();
      await page.goto(base + p, { waitUntil: 'load' }).catch(() => {});
      await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 40_000 }).catch(() => {});
      await sleep(6000);
      const imgs = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active img')].filter((i) => i.complete && i.naturalWidth > 0).length);
      const views = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block[data-for-class]')].map((b) => (b.querySelector('h2,h3,.ldh-block-title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' [' + (b.querySelector('.ldh-view-toolbar .count b')?.textContent?.trim() ?? '') + (b.querySelector('button.add-instance') ? ', Create' : '') + ']'));
      const counts = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-view-toolbar .count b')].map((b) => b.textContent.trim()));
      await page.screenshot({ path: `${OUT}/${name}.png` });
      console.log(`  ${p}: ${Date.now() - t0}ms, ${imgs} images painted, counts ${JSON.stringify(counts)}, derived views ${JSON.stringify(views)}`);
    }
  } });
