import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
const { target, identity, ...a } = await resolve('/categories/');
await runScene({
  id: 'probe-cm', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot, target }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    console.log('  [ContentMode] tb-query:', await page.locator('button.tb-query').count(), '| CodeMirror:', await page.locator('.CodeMirror').count());
    await switchDocumentMode(page, cursor, 'read-mode');
    await page.waitForTimeout(8000);
    console.log('\n  tb-query buttons:', await page.locator('button.tb-query').count(),
      '| ldh-sparql:', await page.locator('.ldh-sparql').count(),
      '| collapsed:', await page.locator('.ldh-sparql.is-collapsed').count());
    console.log('  .CodeMirror total:', await page.locator('.CodeMirror').count());
    console.log('  in active pane:', await page.locator('.ldh-pane.is-active .CodeMirror').count());
    console.log('  boxes:', await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].map((e) => {
      const r = e.getBoundingClientRect();
      const pane = e.closest('.ldh-pane');
      return `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.y)} vis=${e.checkVisibility()} pane=${pane ? pane.className.replace('ldh-pane ', '') : 'none'}`;
    }).join('\n    ')));
    const tb = page.locator('button.tb-query').first();
    if (await tb.count()) {
      await tb.scrollIntoViewIfNeeded().catch(() => {});
      await tb.click({ force: true }).catch((e) => console.log('  tb click failed:', e.message.slice(0, 50)));
      await page.waitForTimeout(3000);
      console.log('  after tb-query — boxes:', await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }).join(' ')));
      await shot('revealed');
    }
    const first = page.locator('.ldh-pane.is-active .CodeMirror').first();
    if (await first.count()) { await first.scrollIntoViewIfNeeded().catch((e) => console.log('  scroll failed:', e.message.slice(0, 60))); await page.waitForTimeout(2000); await shot('cm'); }
  },
}, {});
