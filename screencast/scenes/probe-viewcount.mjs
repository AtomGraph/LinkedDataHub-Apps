// Read-only: what count a derived view shows right now, twice.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-viewcount', target: base + '/customers/GOURL/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (let i = 0; i < 2; i++) {
      await page.goto(base + '/customers/GOURL/', { waitUntil: 'load' });
      const v = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Orders from this customer' }).first();
      await v.locator('.ldh-view-toolbar .count b').first().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
      await sleep(3000);
      console.log(`  load ${i + 1}: Orders from this customer =`, (await v.locator('.ldh-view-toolbar .count b').first().textContent().catch(() => '?')).trim());
    }
  } });
