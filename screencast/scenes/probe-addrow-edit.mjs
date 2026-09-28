// Read-only: does the add-property row work on an EDIT form, and on a create modal for
// a property that already has a value? Nothing is saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-addrow-edit', target: base + '/employees/7/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(base + '/employees/7/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }); await sleep(4000);
    const repBlock = page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: /Family name/ }).first();
    await repBlock.locator('button').filter({ hasText: /edit/ }).first().click(); await sleep(3000);
    const form = page.locator('.ldh-pane.is-active form').filter({ has: page.locator('button.btn-save') }).last();
    const terr = () => form.locator('.ldh-prop-group').filter({ has: page.locator('input[name="pu"][value$="areaServed"]') });
    console.log('  edit form territory rows before:', await terr().count());
    const sel = form.locator('.ldh-prop-addrow select').first();
    const v = await sel.evaluate((s) => [...s.options].find((o) => o.value.endsWith('areaServed'))?.value);
    await sel.selectOption(v); await sleep(300);
    await form.locator('.ldh-prop-addrow button.add-value').first().click(); await sleep(2500);
    console.log('  after Add: territory rows', await terr().count(), '| alert:', JSON.stringify(await page.locator('.ac-alert, [role=alert]').allTextContents().catch(() => [])).slice(0, 200));
    const last = terr().last().locator('input:not([type=hidden])').first();
    console.log('  last row input:', await last.count(), await last.getAttribute('class').catch(() => null));
    const cancel = form.locator('button').filter({ hasText: /Cancel|Close|Reset/ }).first();
    if (await cancel.count()) await cancel.click(); else await page.keyboard.press('Escape');
    await sleep(500);

    // create modal on Fuller's Direct reports: Add areaServed when the row is still empty
    await page.goto(base + '/employees/2/', { waitUntil: 'load' });
    const block = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const btn = block.locator('button.add-instance').first();
    await btn.waitFor({ state: 'visible', timeout: 25_000 }); await btn.click();
    const modal = page.locator('.modal-constructor, .ac-modal').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(2000);
    const mterr = () => modal.locator('.ldh-prop-group').filter({ has: page.locator('input[name="pu"][value$="areaServed"]') });
    console.log('  modal territory rows before:', await mterr().count());
    const msel = modal.locator('.ldh-prop-addrow select').first();
    const mv = await msel.evaluate((s) => [...s.options].find((o) => o.value.endsWith('areaServed'))?.value);
    await msel.selectOption(mv); await sleep(300);
    await modal.locator('.ldh-prop-addrow button.add-value').first().click(); await sleep(2500);
    console.log('  modal after Add: territory rows', await mterr().count(), '| alert:', JSON.stringify(await modal.locator('.ac-alert, [role=alert]').allTextContents().catch(() => [])).slice(0, 200));
    await page.keyboard.press('Escape'); await sleep(400);
    const close = modal.locator('button').filter({ hasText: /Close/ }).first(); if (await close.count()) await close.click().catch(() => {});
  } });
