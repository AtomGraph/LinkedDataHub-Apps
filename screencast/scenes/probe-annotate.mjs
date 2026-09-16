import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { selectWord } from '../lib/annotate.mjs';

const { target, identity, ...a } = await resolve('/category-alignment/');

await runScene({
  id: 'probe-annotate', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, target }) {
    await page.goto(target, { waitUntil: 'load' });
    await sleep(8000);

    const prose = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'published vocabulary' }).first();
    console.log('  prose blocks matching:', await page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'published vocabulary' }).count());
    await prose.scrollIntoViewIfNeeded();
    await prose.hover();
    await sleep(600);
    await cursor.click(prose.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last());
    await sleep(4000);

    const at = await selectWord(page, 'Beverages');
    console.log('  selectWord:', JSON.stringify(at));
    if (!at) return;

    await page.mouse.click(at.x, at.y, { button: 'right' });
    await sleep(2500);
    const overlay = page.locator('#rdfa-editor-overlay:visible').first();
    console.log('  overlay visible:', await overlay.count());

    const prop = overlay.locator('input.property-combobox').first();
    console.log('  property input:', await prop.count());
    await cursor.click(prop);
    await page.keyboard.type('exact', { delay: 90 });
    for (const wait of [1500, 3000, 6000, 10000]) {
      await sleep(wait === 1500 ? wait : 3000);
      const items = await page.locator('.ac-cb-panel[role="listbox"] li.ac-cb-item').allTextContents().catch(() => []);
      console.log(`  after ~${wait}ms — ${items.length} suggestions:`, JSON.stringify(items.slice(0, 8)));
      if (items.length) break;
    }
  },
}, {});
