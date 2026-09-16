import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
const { target, identity, ...a } = await resolve('/world-context/');
await runScene({
  id: 'probe-fed', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, target, shot }) {
    // a probe, so the mode goes in the URL rather than through the switcher
    await page.goto(target + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode'), { waitUntil: 'load' });
    await sleep(9000);
    console.log('  blocks:', await page.evaluate(() =>
      [...document.querySelectorAll('.ldh-block-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 34)).join(' | ') || '(none)'));
    const row = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'against the public record' }).first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    const t0 = Date.now();
    const tb = row.locator('button.tb-query').first();
    if (await tb.count()) { await cursor.click(tb); await sleep(2000); }
    // results arrive when the block shows rows
    const got = await page.waitForFunction(() => {
      const r = [...document.querySelectorAll('.ldh-block-row')].find((x) => /against the public record/.test(x.textContent));
      return r && /Germany|France|Brazil/.test(r.textContent) && /\d{2},\d{3},\d{3}/.test(r.textContent);
    }, null, { timeout: 45000 }).then(() => true, () => false);
    console.log(`  remote results on screen: ${got} after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await shot('federated');
  },
}, {});
