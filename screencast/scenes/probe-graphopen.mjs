import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { expand, foreignNode, nodeById, select, zoomToFit } from '../lib/graph.mjs';

const opts = await resolve('/');
const ORDER = '11074';
const GRAPH_MODE = 'https://w3id.org/atomgraph/client#GraphMode';
const OPENS_ON = `${opts.base}/orders/${ORDER}/?mode=${encodeURIComponent(GRAPH_MODE)}`;

await runScene({
  id: 'probe-graphopen', target: OPENS_ON, identity: opts.identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(4000);
    await zoomToFit(page, cursor);
    await sleep(1200);

    const n = await foreignNode(page, `${opts.base}/orders/${ORDER}/`, { skip: 0, prefer: /\/(customers|employees|shippers|products)\// });
    if (!n || n.error) { console.log('  no node', n); return; }
    const r = await expand(page, cursor, n);
    console.log('  expanded', n.id, JSON.stringify({ ok: r.ok, gained: r.gained }));
    await zoomToFit(page, cursor);
    await sleep(1200);

    const again = await nodeById(page, n.id);
    console.log('  again:', JSON.stringify(again));
    if (again.error) return;
    const picked = await select(page, cursor, again);
    console.log('  picked:', JSON.stringify({ ok: picked.ok, href: picked.href, why: picked.why }));
    if (!picked.ok) return;

    const box = await picked.link.boundingBox();
    console.log('  anchor box:', JSON.stringify(box));
    console.log('  topmost at centre:', await page.evaluate(({ x, y }) => {
      const e = document.elementFromPoint(x, y);
      return e ? `<${e.tagName.toLowerCase()}> class="${e.className}"` : '(nothing)';
    }, { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }));

    const pagesBefore = page.context().pages().length;
    await picked.link.click({ force: true });
    await sleep(5000);
    console.log('  pages:', pagesBefore, '->', page.context().pages().length);
    console.log('  urls:', page.context().pages().map((p) => p.url()).join('\n         '));
  },
}, {});
