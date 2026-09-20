// Read-only: what the composed page holds after the take — block rows, their types,
// drag handles, nested rows — and whether the same DragEvent sequence reorders here.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { contentModeUrl } from '../lib/blocks.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const doc = `${base.replace(/\/$/, '')}/supercut-compose/`;
await runScene({ id: 'probe-compose-state', target: doc, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(contentModeUrl(doc), { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block-row', { state: 'attached', timeout: 30_000 }).catch(() => {}); await sleep(5000);
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')];
      return rows.map((r) => ({ about: r.getAttribute('about')?.slice(-12), cls: r.className, typeof: r.getAttribute('typeof'), depth: [...(function* () { let p = r.parentElement; while (p) { if (p.classList?.contains('ldh-block-row')) yield 1; p = p.parentElement; } })()].length, handle: !!r.querySelector(':scope > * span.ldh-bh-drag, :scope > span.ldh-bh-drag'), anyHandle: r.querySelectorAll('span.ldh-bh-drag').length, text: r.textContent.trim().slice(0, 60).replace(/\s+/g, ' ') }));
    });
    console.log('  rows:', JSON.stringify(r, null, 1));
    const charts = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row svg')].length);
    console.log('  svgs:', charts);
  } });
