// Read-only: the sort and facet controls the category page's product list offers.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/categories/1/');
const { identity, target } = opts;
await runScene({ id: 'probe-catsort', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block[data-for-class] .ldh-view-toolbar', { timeout: 25_000 }).catch(() => {});
    await sleep(6000);
    const tb = page.locator('.ldh-pane.is-active .ldh-block[data-for-class] .ldh-view-toolbar').first();
    console.log('  toolbar text:', JSON.stringify((await tb.textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300)));
    console.log('  selects:', JSON.stringify(await tb.locator('select').evaluateAll((els) => els.map((s) => ({ name: s.name || s.className, options: [...s.options].map((o) => o.textContent.trim()) })))));
    console.log('  pills:', JSON.stringify(await tb.locator('button, .ac-tag, .ldh-pivot-pill, .facet-pill, summary').allTextContents()));
    console.log('  rows:', JSON.stringify((await page.locator('.ldh-pane.is-active .ldh-block[data-for-class] table tbody tr').allTextContents()).slice(0, 3).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 120))));
    console.log('  headers:', JSON.stringify(await page.locator('.ldh-pane.is-active .ldh-block[data-for-class] table thead th').allTextContents()));
  } });
