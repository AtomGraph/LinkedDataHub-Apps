// Read-only: which fields the new constructors put on a Create form. Opens, reads, closes.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const CASES = [
  { page: '/customers/GOURL/', view: 'Orders from this customer' },
  { page: '/employees/2/', view: 'Direct reports' },
  { page: '/suppliers/1/', view: 'Products supplied by this supplier' },
];
await runScene({ id: 'probe-ctorform', target: base + CASES[0].page, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const c of CASES) {
      await page.goto(base + c.page, { waitUntil: 'load' });
      const block = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: c.view }).first();
      const btn = block.locator('button.add-instance').first();
      const ok = await btn.waitFor({ state: 'visible', timeout: 25_000 }).then(() => true, () => false);
      if (!ok) { console.log(`  ${c.page} ${c.view}: no Create button`); continue; }
      await btn.click();
      const modal = page.locator('.modal-constructor, .ac-modal').last();
      await modal.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      await sleep(2500);
      const fields = await modal.locator('.ldh-prop-group').evaluateAll((gs) => gs.map((g) => {
        const label = (g.querySelector('label, .ldh-prop-label, dt')?.textContent || g.textContent).replace(/\s+/g, ' ').trim().slice(0, 22);
        const inp = g.querySelector('input:not([type=hidden]), select, textarea');
        return `${label}[${inp ? (inp.type || inp.tagName.toLowerCase()) : '-'}${inp?.value ? '=' + inp.value.slice(0, 18) : ''}]`;
      }));
      console.log(`  ${c.page} ${c.view} (${btn.evaluate ? await btn.getAttribute('data-for-class') : ''}): ${fields.join(' | ')}`);
      const close = modal.locator('button').filter({ hasText: /Close|close/ }).first();
      if (await close.count()) await close.click(); else await page.keyboard.press('Escape');
      await sleep(800);
    }
  } });
