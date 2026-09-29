// Read-only: after expanding the customer node of a late order, is the customer
// described in the graph's document, and what does the info panel render?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { expand, foreignNode, graphState, nodeById, select, zoomToFit } from '../lib/graph.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = process.env.ORDER || '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
await runScene({
  id: 'probe-graphdesc', target: OPENS_ON, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 });
    await sleep(4000); await zoomToFit(page, cursor);
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    console.log('  customer node:', JSON.stringify(node));
    const r = await expand(page, cursor, node);
    console.log('  expand:', JSON.stringify({ ok: r.ok, gained: r.gained, before: r.before, after: r.after }));
    const info = await page.evaluate((id) => {
      const gs = window.LinkedDataHub?.graphs ?? {};
      const [cid, g] = Object.entries(gs).filter(([k]) => document.getElementById(k)?.offsetParent !== null).at(-1) ?? [];
      const doc = g?.document;
      const abouts = doc ? [...doc.querySelectorAll('Description')].map((d) => d.getAttribute('rdf:about')).filter(Boolean) : [];
      return { canvas: cid, loaded: g?.loadedUris ?? g?.['loaded-uris'] ?? Object.keys(g ?? {}), described: abouts.length, hasCustomer: abouts.includes(id), sample: abouts.filter((a) => a.includes('customers')).slice(0, 5) };
    }, node.id);
    console.log('  graph document:', JSON.stringify(info));
    const again = await nodeById(page, node.id);
    const picked = await select(page, cursor, again);
    console.log('  select:', JSON.stringify({ ok: picked.ok, why: picked.why, href: picked.href }));
    console.log('  panel:', (await page.locator('[id^="info-content-"]').first().innerHTML().catch(() => '')).slice(0, 400));
  },
});
