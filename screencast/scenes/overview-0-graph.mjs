// The overview's opening: an order in Graph mode, the nodes settling, held for the intro
// line. Nothing is clicked — the take is the picture under the narration, and the force
// layout settling is all the motion it needs. Dark, 2×, like the other overview takes.
//
// Beats: 0.1-start when the graph has painted and been fitted, 0.1-end after the hold.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { zoomToFit } from '../lib/graph.mjs';
import { GEOMETRY_2X, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;

await runScene({
  id: 'overview-0-graph', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await load(page, OPENS_ON, 'canvas', 3000);
    await zoomToFit(page, cursor);
    await sleep(1500);
    // The pointer out of the way: the frame is the graph, not a hand over it.
    await cursor.moveTo(2700, 1700, { duration: 600 });
    await marks.beat('0.1-start', 'the order as a graph, fitted');
    await sleep(18_000);
    await marks.beat('0.1-end', 'the graph, settled');
    await sleep(800);
    await marks.beat('end');
  },
});
