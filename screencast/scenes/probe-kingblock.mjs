// Read-only: the anchors in King's record block after the reporting line was changed.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/employees/7/');
const { identity, target } = opts;
await runScene({ id: 'probe-kingblock', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }); await sleep(5000);
    const blocks = page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: /Reports to/ });
    console.log('  blocks with Reports to:', await blocks.count());
    const row = blocks.first().locator('.ldh-prop-group, tr, dl, div').filter({ hasText: /^\s*Reports to/ }).first();
    console.log('  row html:', JSON.stringify(await blocks.first().evaluate((b) => { const t = [...b.querySelectorAll('*')].find((e) => /^\s*Reports to\s*$/.test(e.textContent)); let e = t; for (let i = 0; i < 3 && e; i++) e = e.parentElement; return e ? e.outerHTML.replace(/\s+/g, ' ').slice(0, 700) : null; })));
    console.log('  anchors with Fuller:', JSON.stringify(await blocks.first().locator('a').filter({ hasText: /Fuller/ }).evaluateAll((as) => as.map((a) => a.outerHTML.replace(/\s+/g, ' ').slice(0, 160)))));
  } });
