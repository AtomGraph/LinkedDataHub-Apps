// Read-only: two searches in one take, from a content page — what the dialog reports.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { searchGo } from '../lib/nav.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const [pg] = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "Late: the customer or the shipper?" } }`);
await runScene({ id: 'probe-search2', target: pg.doc, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(pg.doc, { waitUntil: 'load' }); await sleep(5000);
    for (let i = 0; i < 2; i++) {
      const r = await searchGo(page, cursor, '10423', { type: 'Order' });
      console.log(`  search ${i + 1}:`, JSON.stringify({ ok: r.ok, why: r.why, total: r.total, href: r.href }));
      const modals = await page.locator('.ac-modal').evaluateAll((ms) => ms.map((m) => ({ visible: m.offsetParent !== null, text: m.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) })));
      console.log('  modals:', JSON.stringify(modals));
      await sleep(1500);
    }
  } });
