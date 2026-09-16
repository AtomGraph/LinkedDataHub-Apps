// Not a scene. What Create ▸ Item does on camera: the modal's fields, its scope,
// where Save lands, and what the breadcrumb looks like — so a scene can create its
// write-up document from where it already is instead of teleporting to a fixture.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/';
const opts = await resolve(where);
const { target, identity, base } = opts;

await runScene({
  id: 'probe-createitem', target, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(target, { waitUntil: 'load' });
    await sleep(6000);

    console.log('  breadcrumb DOM:', await page.evaluate(() => {
      const cands = [...document.querySelectorAll('[role="navigation"] a, [role="navigation"] button')]
        .filter((e) => e.offsetParent !== null).slice(0, 8);
      return JSON.stringify(cands.map((e) => ({ tag: e.tagName.toLowerCase(), cls: e.className, text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 24), href: e.getAttribute('href') })));
    }));

    const menu = page.locator('button.drop-toggle').filter({ hasText: 'Create' }).first();
    console.log('  Create buttons visible:', await page.locator('button.drop-toggle').filter({ hasText: 'Create' }).count());
    await cursor.click(menu);
    await sleep(1400);
    console.log('  offers:', await page.evaluate(() => JSON.stringify(
      [...document.querySelectorAll('.add-constructor')].filter((e) => e.offsetParent !== null)
        .map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 22)))));
    // Ligature-tolerant: the entry's text is "descriptionItem" — icon glyph run into the word.
    const item = page.locator('.add-constructor').filter({ hasText: /Item$/ }).first();
    if (!(await item.isVisible().catch(() => false))) { console.log('  no Item entry'); return; }
    await cursor.click(item);
    await sleep(3500);

    console.log('  modal:', await page.evaluate(() => {
      const m = [...document.querySelectorAll('.modal, .modal-constructor, [class*="modal"]')].find((e) => e.offsetParent !== null);
      if (!m) return '(no visible modal)';
      const inPane = !!m.closest('.ldh-pane.is-active');
      const groups = [...m.querySelectorAll('.ldh-prop-group')].map((g) => {
        const inputs = [...g.querySelectorAll('input:not([type=hidden]), select, textarea')].map((x) => `${x.tagName.toLowerCase()}[name=${x.name}]`);
        return `${g.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)} -> ${inputs.join(',') || '(none)'}`;
      });
      const btns = [...m.querySelectorAll('button')].map((b) => `${b.className.split(' ').slice(0, 3).join('.')}:${b.innerText.trim().slice(0, 12)}`);
      return JSON.stringify({ cls: m.className, insideActivePane: inPane, groups, buttons: btns }, null, 1);
    }));

    // Fill Title by property name and save; report where it lands and in what mode.
    const title = page.locator('.modal .ldh-prop-group, .modal-constructor .ldh-prop-group').filter({ hasText: 'Title' }).first()
      .locator('input:not([type=hidden]):visible').first();
    if (await title.count()) {
      await cursor.click(title);
      await title.pressSequentially('Probe created on camera', { delay: 30 });
      const saveBtn = page.locator('.modal button, .modal-constructor button').filter({ hasText: /Save|Create/ }).last();
      console.log('  save button:', await saveBtn.innerText().catch(() => '?'));
      await cursor.click(saveBtn);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(5000);
      console.log('  landed on:', page.url());
      console.log('  mode toggle:', (await page.locator('button.layout-modes.drop-toggle, button[title="Mode"]').first().textContent().catch(() => '?')).replace(/\s+/g, ' ').trim());
      console.log('  document title:', await page.title());
    } else console.log('  no Title field found in modal');
  },
}, {});
