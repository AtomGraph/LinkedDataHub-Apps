// Read-only: the control that adds a property value to a form, and what "edit" on a
// committed chip turns into. Nothing is saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-addvalue', target: base + '/employees/2/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(base + '/employees/2/', { waitUntil: 'load' });
    const block = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const btn = block.locator('button.add-instance').first();
    await btn.waitFor({ state: 'visible', timeout: 25_000 }); await btn.click();
    const modal = page.locator('.modal-constructor, .ac-modal').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(2000);
    console.log('  inputs:', JSON.stringify(await modal.locator('input:not([type=hidden])').evaluateAll((is) => is.map((i) => (i.className || i.type) + (i.placeholder ? '{' + i.placeholder + '}' : '')))));
    const addBtn = modal.locator('button').filter({ hasText: /Add/ }).last();
    console.log('  add row:', JSON.stringify(await addBtn.evaluate((b) => { let e = b; for (let i = 0; i < 3 && e; i++) e = e.parentElement; return e ? e.outerHTML.replace(/\s+/g, ' ').slice(0, 900) : null; })));
    const prop = modal.locator('input.property-combobox, input.prop-combobox, input[class*="property"]').first();
    console.log('  property combobox:', await prop.count());
    if (await prop.count()) {
      await prop.click(); await page.keyboard.type('Territory', { delay: 60 }); await sleep(1800);
      const items = page.locator('.ac-cb-panel[role="listbox"]:visible li.ac-cb-item');
      console.log('  suggestions:', JSON.stringify((await items.allTextContents().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 40))));
      if (await items.count()) { await items.first().click(); await sleep(600); await addBtn.click(); await sleep(1200); }
      console.log('  territory groups now:', await modal.locator('.ldh-prop-group').filter({ hasText: /^\s*Territory/ }).count());
    }
    // what "edit" on a committed chip does: the Type row has one
    const chipEdit = modal.locator('.ldh-prop-group').filter({ hasText: /^\s*Reports to/ }).first().locator('button').filter({ hasText: /edit/ }).first();
    console.log('  reports-to edit btn:', await chipEdit.count());
    await page.keyboard.press('Escape'); await sleep(500);
    const close = modal.locator('button').filter({ hasText: /Close/ }).first(); if (await close.count()) await close.click().catch(() => {});

    // King's edit form: edit on a committed chip
    await page.goto(base + '/employees/7/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }); await sleep(4000);
    const repBlock = page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: /Family name/ }).first();
    await repBlock.locator('button').filter({ hasText: /edit/ }).first().click(); await sleep(3000);
    const form = page.locator('.ldh-pane.is-active form').filter({ has: page.locator('button.btn-save') }).last();
    const rt = form.locator('.ldh-prop-group').filter({ hasText: /^\s*Reports to/ }).first();
    await rt.locator('button').filter({ hasText: /edit/ }).first().click(); await sleep(800);
    console.log('  reports-to after edit:', JSON.stringify(await rt.evaluate((g) => g.outerHTML.replace(/\s+/g, ' ').slice(0, 600))));
    console.log('  form inputs:', JSON.stringify(await form.locator('input:not([type=hidden])').evaluateAll((is) => is.map((i) => (i.className || i.type) + (i.placeholder ? '{' + i.placeholder + '}' : '')).filter((c, i, a) => a.indexOf(c) === i))));
    const cancel = form.locator('button').filter({ hasText: /Cancel|Close|Reset/ }).first();
    if (await cancel.count()) await cancel.click(); else await page.keyboard.press('Escape');
  } });
