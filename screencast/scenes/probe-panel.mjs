import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { field } from '../lib/constructors.mjs';

const { target, identity, ...a } = await resolve('/probe-scratch/');
const CONTENT = '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/linkeddatahub#ContentMode');

await runScene({
  id: 'probe-panel', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, target }) {
    await page.goto(target + CONTENT, { waitUntil: 'load' });   // a probe, not a take
    await page.waitForTimeout(9000);
    const btn = ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first();
    console.log('  add buttons:', await ui(page).locator('button.create-action.add-constructor').count());
    await cursor.click(btn);
    await page.waitForTimeout(3500);
    const value = field(page, 'Value', 'input:not([type=hidden]):visible');
    console.log('  forClass on the box:', await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ac-cb-box')].find((e) => e.offsetParent);
      return b ? (b.dataset.forClass || '(unset)') : '(no box)';
    }));
    for (const term of ['All employees', 'All customers', 'All territories']) {
      await value.click();
      await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace');
      await value.pressSequentially(term, { delay: 60 });
      await page.waitForTimeout(5000);
      console.log(`  "${term}" →`, await page.evaluate(() => {
        const p = [...document.querySelectorAll('.ac-cb-panel')].find((e) => e.offsetParent);
        return p ? [...p.children].map((e) => JSON.stringify(e.innerText)).join('  ') : '(hidden)';
      }));
    }
  },
}, {});
