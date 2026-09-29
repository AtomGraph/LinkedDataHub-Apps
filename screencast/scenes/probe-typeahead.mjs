import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { field } from '../lib/constructors.mjs';
import { ui } from '../lib/dom.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { target, identity, ...a } = await resolve('/probe-scratch/');
const TERMS = ['All products', 'All categories', 'All territories', 'All employees', 'All suppliers'];

await runScene({
  id: 'probe-typeahead', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, target, shot }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(8000);

    await switchDocumentMode(page, cursor, 'content-mode');
    await page.waitForTimeout(6000);
    const btn = ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first();
    console.log('  mode now:', page.url().slice(-40), '| add buttons:', await ui(page).locator('button.create-action.add-constructor').count());
    if (!(await btn.count())) { console.log('no + Object button'); return; }
    await cursor.click(btn);
    await page.waitForTimeout(3000);

    const value = field(page, 'Value', 'input:not([type=hidden]):visible');
    console.log('\n  Value field:', await value.count());
    if (!(await value.count())) return;

    for (const term of TERMS) {
      await value.click();
      await page.keyboard.press('Meta+A');
      await page.keyboard.press('Backspace');
      await value.pressSequentially(term, { delay: 60 });
      await page.waitForTimeout(3500);
      const dump = await page.evaluate(() => {
        const panel = [...document.querySelectorAll('.ac-cb-panel[role="listbox"]')].find((e) => e.offsetParent);
        if (!panel) return { sel: '(panel hidden)', items: [], html: '' };
        const kids = [...panel.children];
        return {
          sel: panel.className,
          items: kids.slice(0, 5).map((e) => {
            const lbl = e.querySelector('.ac-cb-item-lbl');
            return `innerText=${JSON.stringify(e.innerText)} lbl=${JSON.stringify(lbl ? lbl.innerText : null)}`;
          }),
          html: kids[0] ? kids[0].outerHTML.slice(0, 260) : '',
        };
      });
      console.log(`  "${term}" → ${dump.sel}\n      ${dump.items.join('\n      ') || '(no suggestions)'}`);
      if (dump.html) console.log('      html:', dump.html);
    }
    await shot('typeahead');
    // leave without saving
    await page.keyboard.press('Escape');
  },
}, {});
