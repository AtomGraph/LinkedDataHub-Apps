// Read-only: the three form gestures the loop extensions need. Nothing is saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const dump = async (scope) => scope.locator('.ldh-prop-group').evaluateAll((gs) => gs.map((g) => {
  const label = (g.querySelector('label, .ldh-prop-label, dt')?.textContent || g.textContent).replace(/\s+/g, ' ').trim().slice(0, 18);
  const inputs = [...g.querySelectorAll('input:not([type=hidden]), select, textarea')].map((i) => (i.type || i.tagName.toLowerCase()) + (i.value ? '=' + i.value.slice(0, 30) : ''));
  const removes = g.querySelectorAll('button, [role=button]').length;
  return `${label}[${inputs.join(',')}|btn${removes}]`;
}));
await runScene({ id: 'probe-editforms', target: base + '/employees/2/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    // 1. Person create modal from Fuller's Direct reports: add a second Territory field
    await page.goto(base + '/employees/2/', { waitUntil: 'load' });
    const block = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const btn = block.locator('button.add-instance').first();
    await btn.waitFor({ state: 'visible', timeout: 25_000 });
    await btn.click();
    const modal = page.locator('.modal-constructor, .ac-modal').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(2000);
    console.log('  person form:', (await dump(modal)).join(' '));
    const adder = modal.locator('input.property-combobox, input[placeholder*="type" i], .ac-cb-box input').last();
    console.log('  adder:', await adder.count(), await adder.getAttribute('placeholder').catch(() => null), await adder.getAttribute('class').catch(() => null));
    console.log('  add button:', JSON.stringify(await modal.locator('button').filter({ hasText: /Add/ }).allTextContents()));
    if (await adder.count()) {
      await adder.click(); await page.keyboard.type('Territory', { delay: 60 }); await sleep(1500);
      const items = modal.locator('.ac-cb-panel[role="listbox"] li.ac-cb-item, .ac-cb-panel li');
      console.log('  adder suggestions:', JSON.stringify(await items.allTextContents().catch(() => [])));
      if (await items.count()) { await items.first().click(); await sleep(800); }
      const add = modal.locator('button').filter({ hasText: /^\s*(add|Add)\s*$/ }).last();
      if (await add.count()) { await add.click(); await sleep(1200); }
      console.log('  after add:', (await dump(modal)).join(' '));
    }
    await page.keyboard.press('Escape'); await sleep(600);
    const close = modal.locator('button').filter({ hasText: /Close/ }).first(); if (await close.count()) await close.click().catch(() => {});
    await sleep(800);

    // 2. Order 10423 in Properties: per-resource edit of the order
    await page.goto(base + '/orders/10423/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }); await sleep(4000);
    const orderBlock = page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: /Order status/ }).first();
    const editBtns = orderBlock.locator('button.btn-edit, button[class*="edit"], button.ac-iconbtn').filter({ hasText: /edit/ });
    console.log('  order block edit buttons:', await editBtns.count(), JSON.stringify(await orderBlock.locator('button').allTextContents().catch(() => [])).slice(0, 200));
    if (await editBtns.count()) {
      await editBtns.first().click(); await sleep(3000);
      const form = page.locator('.ldh-pane.is-active form').filter({ has: page.locator('button.btn-save') }).last();
      console.log('  order edit form:', (await dump(form)).join(' '));
      const cancel = form.locator('button').filter({ hasText: /Cancel|Close|Reset/ }).first();
      if (await cancel.count()) await cancel.click(); else await page.keyboard.press('Escape');
      await sleep(800);
    }

    // 3. King (/employees/7/): edit form, territory values and their remove controls
    await page.goto(base + '/employees/7/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }); await sleep(4000);
    const repBlock = page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: /Family name/ }).first();
    const e2 = repBlock.locator('button').filter({ hasText: /edit/ });
    console.log('  rep block edit buttons:', await e2.count());
    if (await e2.count()) {
      await e2.first().click(); await sleep(3000);
      const form = page.locator('.ldh-pane.is-active form').filter({ has: page.locator('button.btn-save') }).last();
      const terr = form.locator('.ldh-prop-group').filter({ hasText: /^\s*Territory/ });
      console.log('  rep edit form:', (await dump(form)).join(' ').slice(0, 900));
      console.log('  territory groups:', await terr.count(), JSON.stringify(await terr.first().locator('button').allTextContents().catch(() => [])), JSON.stringify(await terr.first().evaluate((g) => g.outerHTML.slice(0, 500)).catch(() => '')));
      const cancel = form.locator('button').filter({ hasText: /Cancel|Close|Reset/ }).first();
      if (await cancel.count()) await cancel.click(); else await page.keyboard.press('Escape');
    }
  } });
