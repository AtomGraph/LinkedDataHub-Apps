// Supercut takes on Northwind, the graph pair: a node blooms across a document
// boundary (1) and a node opens its record (1b). Recorded on a 2880×1800 viewport at
// zoom 1 — the canvas fills the pane, so the graph is native-sharp without the
// document zoom the other takes use (its hit-testing works in unzoomed pixels).
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { foreignNode, expand, select, zoomToFit, approach } from '../lib/graph.mjs';
import { GEOMETRY_2X, focus, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;

await runScene({
  id: 'supercut-northwind-graph', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await load(page, OPENS_ON, 'canvas', 3000);
    await zoomToFit(page, cursor);
    await sleep(2500);
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    if (!node || node.error) throw new Error(node?.error ?? 'no customer node');
    const at = await approach(page, cursor, node.id, { fallback: node });
    const around = (p, r) => ({ focus: { x: Math.round(p.x - r), y: Math.round(p.y - r * 0.625), w: r * 2, h: Math.round(r * 1.25) } });
    await marks.beat('1-start', 'the pointer on the customer node', around(at, 520));
    const r = await expand(page, cursor, node, { settle: 3500 });
    const at2 = await approach(page, cursor, node.id, { fallback: at });
    await marks.beat('1-end', r.ok ? `+${r.gained} nodes from the customer's own document` : r.why ?? 'no bloom', around(at2, 760));
    await sleep(700);

    await zoomToFit(page, cursor);
    await sleep(1500);
    const picked = await select(page, cursor, { ...node });
    if (!picked.ok) throw new Error(picked.why);
    const panel = page.locator('[id^="info-content-"]').first();
    await marks.beat('1b-start', 'the node selected; its link in the panel', await focus(panel));
    const before = page.url().split('?')[0];
    if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 500, settle: 150, after: 200 }); else await picked.link.click();
    await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 20_000 }).catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('1b-end', `the record: ${page.url().replace(base, '')}`);
    await sleep(600);
    await marks.beat('end');
  },
});
