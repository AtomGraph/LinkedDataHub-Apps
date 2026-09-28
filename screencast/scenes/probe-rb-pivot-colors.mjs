// Read-only: the 2×4 brick's Colors view, then its Color pivot. Nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
const opts = await resolve('/parts/3001/');
const { identity } = opts;
await runScene({ id: 'probe-rb-pivot-colors', target: opts.target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(opts.target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 40_000 }); await sleep(5000);
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Colors' }).last();
    await view.evaluate((el) => el.scrollIntoView({ block: 'start' })); await sleep(1500);
    await page.screenshot({ path: process.env.SHOTS + '/rb-colors-view.png' });
    const bar = view.locator('details.ldh-pivot-bar').first();
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await bar.locator('summary').first().click(); await sleep(700); }
    const pill = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Color' }).first();
    console.log('  pill:', await pill.count(), await pill.textContent().catch(() => ''));
    const t0 = Date.now();
    await pill.click();
    await page.waitForFunction(() => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== '78'; }, null, { timeout: 30_000 }).catch(() => console.log('  count did not change'));
    console.log('  pivot took', Date.now() - t0, 'ms');
    await sleep(2500);
    await page.screenshot({ path: process.env.SHOTS + '/rb-colors-pivot.png' });
    console.log('  after:', await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-view-toolbar .count')].map((c) => c.textContent.trim()).join(' | ')));
  } });
