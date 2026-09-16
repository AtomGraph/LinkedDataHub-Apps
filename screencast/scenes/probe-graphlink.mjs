// Not a scene. Read-only: does the info-panel link still carry target="_blank"?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { expand, foreignNode, nodeById, select, zoomToFit } from '../lib/graph.mjs';
const opts = await resolve('/');
const OPENS_ON = `${opts.base}/orders/11074/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
await runScene({ id: 'probe-graphlink', target: OPENS_ON, identity: opts.identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 30_000 }).catch(() => {}); await sleep(4000); await zoomToFit(page, cursor);
    const n = await foreignNode(page, `${opts.base}/orders/11074/`, { prefer: /\/(customers|employees|shippers|products)\// });
    if (!n || n.error) return console.log('  node:', JSON.stringify(n));
    await expand(page, cursor, n); await zoomToFit(page, cursor); await sleep(800);
    const again = await nodeById(page, n.id); if (again.error) return console.log('  again:', again.error);
    const picked = await select(page, cursor, again);
    console.log('  link:', JSON.stringify({ ok: picked.ok, href: picked.href, target: picked.ok ? await picked.link.getAttribute('target') : null }));
  } }, {});
