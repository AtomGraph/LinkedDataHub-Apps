// Read-only: what clicking the Price header does to the product list's order.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/categories/1/');
const { identity, target } = opts;
await runScene({ id: 'probe-tablesort', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(target, { waitUntil: 'load' });
    const list = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Products in this category' }).first();
    await list.waitFor({ state: 'visible', timeout: 25_000 }); await sleep(5000);
    const th = list.locator('table thead th').filter({ hasText: /^Price$/ }).first();
    console.log('  th html:', JSON.stringify(await th.evaluate((e) => e.outerHTML.slice(0, 300))));
    const order = async () => (await list.locator('table tbody tr').evaluateAll((rows) => rows.map((r) => { const c = [...r.querySelectorAll('td')]; return (c[4]?.textContent.trim() || '') + ' ' + (c[6]?.textContent.trim() || ''); }))).slice(0, 4);
    console.log('  before:', JSON.stringify(await order()));
    await th.scrollIntoViewIfNeeded(); await cursor.click(th); await sleep(1500);
    console.log('  after 1 click:', JSON.stringify(await order()), 'aria-sort=', await th.getAttribute('aria-sort'));
    await cursor.click(th); await sleep(1500);
    console.log('  after 2 clicks:', JSON.stringify(await order()), 'aria-sort=', await th.getAttribute('aria-sort'));
    const btn = th.locator('button, a, [role=button]').first();
    console.log('  header control:', await btn.count() ? await btn.evaluate((e) => e.outerHTML.slice(0, 200)) : 'none');
  } });
