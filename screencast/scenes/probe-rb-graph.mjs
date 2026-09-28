// Read-only: a printed 2×4 brick's page in Graph mode on Rebrickable — the nodes, and
// what a double-click on the base part node brings in. Nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { graphState, foreignNode, expand, zoomToFit, approach } from '../lib/graph.mjs';
import { GEOMETRY_2X, load } from '../lib/supercut.mjs';
const opts = await resolve('/parts/3001pr0045/');
const G = `${opts.target}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
await runScene({ id: 'probe-rb-graph', target: G, identity: opts.identity, geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor }) {
    await load(page, G, 'canvas', 4000, { timeout: 120_000 });
    await zoomToFit(page, cursor); await sleep(2500);
    const st = await graphState(page);
    console.log('  nodes:', JSON.stringify(st?.nodes?.map?.((n) => ({ id: n.id?.replace(opts.base ?? '', ''), t: n.type ?? n.label })) ?? st).slice(0, 1500));
    await page.screenshot({ path: process.env.SHOTS + '/rb-graph-0.png' });
    const node = await foreignNode(page, opts.target, { prefer: /\/parts\/3001\/#this/ });
    console.log('  foreign:', JSON.stringify(node).slice(0, 300));
    if (node && !node.error) {
      const r = await expand(page, cursor, node, { settle: 6000 });
      console.log('  expand:', JSON.stringify(r));
      await sleep(2000);
      await page.screenshot({ path: process.env.SHOTS + '/rb-graph-1.png' });
    }
  } });
