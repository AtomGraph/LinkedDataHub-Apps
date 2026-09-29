import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { target, identity, ...a } = await resolve('/categories/');

await runScene({
  id: 'probe-queryblock', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot, target }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    const count = (l) => page.locator('.CodeMirror').count().then((c) => console.log(`  ${l}: CodeMirror=${c}`));

    console.log('  → Properties:', await switchDocumentMode(page, cursor, 'read-mode'));
    await page.waitForTimeout(6000);
    await count('Properties');
    await shot('properties');

    // the query resources declared on this document
    const rows = await page.locator('.ldh-pane.is-active .ldh-block-row, .ldh-pane.is-active [about]').allInnerTexts();
    console.log('  resources:', rows.map((t) => t.split('\n').find((l) => l.trim()) || '').filter(Boolean).slice(0, 14).join(' | ').slice(0, 300));

    // open the query resource's edit form
    const q = page.locator('.ldh-pane.is-active').getByText(/Select categories|categories query/i).first();
    console.log('  query resource on page:', await q.count());
    if (await q.count()) {
      const row = q.locator('xpath=ancestor::*[contains(@class,"ldh-block-row") or contains(@class,"ldh-block")][1]');
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.hover().catch(() => {});
      const pencil = row.locator('button.ac-iconbtn').filter({ hasText: 'edit' });
      console.log('  pencils on it:', await pencil.count());
      if (await pencil.count()) {
        await cursor.click(pencil.first());
        await page.waitForTimeout(7000);
        await count('after pencil');
        await shot('query-edit');
      }
    }
  },
}, {});
