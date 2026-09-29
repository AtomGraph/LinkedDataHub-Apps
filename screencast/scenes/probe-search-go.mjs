import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { searchGo } from '../lib/nav.mjs';

const { target, identity, ...a } = await resolve('/');
await runScene({
  id: 'probe-search-go', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot, target }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    const r = await searchGo(page, cursor, 'Beverages', { type: 'Concept' });
    console.log('\n  searchGo →', JSON.stringify(r));
    console.log('  landed on:', page.url());
    console.log('  h1:', (await page.locator('.ldh-pane.is-active h1, h1').first().innerText().catch(() => '(none)')).slice(0, 60));
    await shot('landed');
  },
}, {});
