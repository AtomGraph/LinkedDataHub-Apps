// Read-only: where does the customer node project, what is near it, and what does the
// canvas say is under the pointer there?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { foreignNode, aim, zoomToFit } from '../lib/graph.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
await runScene({
  id: 'probe-graphaim', target: OPENS_ON, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 });
    await sleep(4000); await zoomToFit(page, cursor); await sleep(3000);
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    const a = await aim(page, node.id, { radius: 40 });
    console.log('  aim r40:', JSON.stringify(a));
    const near = await page.evaluate((wanted) => {
      const gs = window.LinkedDataHub.graphs; const [cid, g] = Object.entries(gs).filter(([k]) => document.getElementById(k)?.offsetParent !== null).at(-1);
      const fg = g.instance ?? g; const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
      const hit = fg.graphData().nodes.find((x) => String(x.id) === wanted);
      const p = fg.graph2ScreenCoords(hit.x, hit.y, hit.z); const cam = fg.camera().position;
      const d = (n) => Math.round(Math.hypot(n.x - cam.x, n.y - cam.y, n.z - cam.z));
      return { canvas: { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.width, ch: c.height, dpr: devicePixelRatio }, mine: { x: p.x, y: p.y, d: d(hit), val: hit.val },
        near: fg.graphData().nodes.filter((n) => n !== hit).map((n) => ({ id: String(n.id).replace(/^https?:\/\//, '').slice(-40), q: fg.graph2ScreenCoords(n.x, n.y, n.z), d: d(n) }))
          .map((o) => ({ id: o.id, dx: Math.round(o.q.x - p.x), dy: Math.round(o.q.y - p.y), d: o.d })).filter((o) => Math.abs(o.dx) < 60 && Math.abs(o.dy) < 60) };
    }, node.id);
    console.log('  near:', JSON.stringify(near));
    await cursor.moveTo(a.x, a.y, { duration: 400 }); await sleep(900);
    console.log('  tooltip at aim:', JSON.stringify(await page.locator('.scene-tooltip, .graph-tooltip').first().textContent().catch(() => null)));
    for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0]]) {
      await page.mouse.move(a.x + dx, a.y + dy); await sleep(500);
      console.log(`  tooltip at ${dx},${dy}:`, JSON.stringify(await page.locator('.scene-tooltip, .graph-tooltip').first().textContent().catch(() => null)));
    }
  },
});
