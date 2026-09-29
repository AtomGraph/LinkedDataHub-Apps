// Read-only: the "type … Add" row at the foot of a constructor modal.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-addrow', target: base + '/employees/2/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(base + '/employees/2/', { waitUntil: 'load' });
    const block = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const btn = block.locator('button.add-instance').first();
    await btn.waitFor({ state: 'visible', timeout: 25_000 }); await btn.click();
    const modal = page.locator('.modal-constructor, .ac-modal').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(2000);
    console.log('  selects:', JSON.stringify(await modal.locator('select').evaluateAll((ss) => ss.map((s) => ({ cls: s.className, n: s.options.length, first: [...s.options].slice(0, 6).map((o) => o.textContent.trim()) })))));
    const addBtn = modal.locator('button').filter({ hasText: /Add/ }).last();
    console.log('  add btn:', JSON.stringify(await addBtn.evaluate((b) => b.outerHTML.replace(/\s+/g, ' ').slice(0, 300))));
    console.log('  add row:', JSON.stringify(await addBtn.evaluate((b) => b.parentElement.outerHTML.replace(/\s+/g, ' ').slice(0, 1200))));
    await addBtn.click(); await sleep(1500);
    console.log('  after Add click, groups:', await modal.locator('.ldh-prop-group').count(), JSON.stringify(await modal.locator('.ldh-prop-group').last().evaluate((g) => g.outerHTML.replace(/\s+/g, ' ').slice(0, 500))));
    await page.keyboard.press('Escape'); await sleep(400);
    const close = modal.locator('button').filter({ hasText: /Close/ }).first(); if (await close.count()) await close.click().catch(() => {});
  } });
