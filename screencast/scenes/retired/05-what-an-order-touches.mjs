// "What does one order touch?"
//
// Opens on the order already in Graph mode — 28 nodes and 52 links on the dark canvas,
// which is the strongest single frame the product produces. That is a bookmark, not a
// synthesised URL: the layout mode lives in the address, so a document saved in Graph
// mode reopens in Graph mode, and RULES.md's one exception is the scene's own starting
// document. Every other mode change in the scene is a click on the switcher.
//
// An order is a transaction with five parties: the customer, the sales rep who booked
// it, the shipper, the products, the delivery. No table shows that shape — a table
// shows one row of it. The graph does, and double-clicking a node expands it along
// the DATA rather than the document, so the neighbours that arrive come from other
// documents entirely.
//
// This is the question the graph beat never had. Every earlier use of it was a tour:
// a control exercised because it existed, over a hairball nobody could place.
//
// Measured before scripting on a sibling order: the document opens as tens of nodes
// and links, a third of them belonging to other documents; one expansion added 6
// nodes and 13 links, and loaded-uris went from 0 to 1.

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { createItem } from '../lib/constructors.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { scrollThrough } from '../lib/frame.mjs';
import { expand, foreignNode, graphState, nodeById, select, zoomToFit } from '../lib/graph.mjs';

const opts = await resolve('/');
// newest-first listing, so the order has to be one the first page actually shows
const ORDER = '11074';

const TITLE = 'What an order touches';
const base = opts.base;
// Last take's write-up document is removed off camera, by title — the document is
// created ON camera below, so its path is a UUID and there is no slug to reset by.
const gone = await deleteByTitle({
  ldh: opts.ldh, base, certFile: opts.certFile,
  certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  title: TITLE,
});
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
let url = null;

// The scene's own bookmark: this order, in the mode the question needs.
const GRAPH_MODE = 'https://w3id.org/atomgraph/client#GraphMode';
const OPENS_ON = `${opts.base}/orders/${ORDER}/?mode=${encodeURIComponent(GRAPH_MODE)}`;

const { identity, ...a } = await resolve('/order-reach/');

await runScene({
  id: '05-what-an-order-touches',
  target: OPENS_ON,
  warm: OPENS_ON,
  identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, type, marks, shot, base }) {
    // ── the shape a table cannot show ───────────────────────────────────────
    // The graph is the opening state, so the first frame is the thing worth watching.
    // The beat fires as soon as the force layout has nodes, which is what the head
    // trim measures against.
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await zoomToFit(page, cursor);

    const opened = await graphState(page);
    await marks.beat('graph', opened
      ? `${opened.nodes} nodes, ${opened.links} links — order ${ORDER} and everyone in it`
      : 'graph not offered');
    await sleep(2400);

    // ── say why, before exploring it ────────────────────────────────────────
    // The graph is established; everything after this is expansion, selection and a
    // jump into another document. Written down first so the exploration has a stated
    // purpose rather than being a control demonstration.
    // Out of the graph the visible way — the breadcrumb is in the action bar in every
    // layout mode — up to Root, then Create ▸ Item. Then the reason for the graph is
    // written before the graph is worked.
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode', { settle: 1800 });
    const p1 = await addProse(page, cursor, type,
      `Order ${ORDER} is one row in the order book below. In graph mode the same order is a set of linked resources. A single click shows a node's description. A double click follows its properties outwards. A right click follows the links that point back at it. The description carries the node's URI as a link, so the graph opens the document.`);
    await marks.beat('question', p1.ok ? 'why the graph was opened' : p1.why);
    // A long hold, deliberately. The next gesture leaves for the canvas, and pacing
    // speeds a static stretch threefold — 0.7s here came out as a fifth of a second
    // in the cut, which is not a sentence anybody read.
    await sleep(6500);

    // Back to the order the way a person gets there: the drawer's search, by number
    // — 830 orders is too many to scroll and a label facet hangs — and then the mode
    // switcher to Graph, on camera. The opening bookmark is not re-used; a URL typed
    // twice is a URL typed once too often.
    const found = await searchGo(page, cursor, ORDER, { type: 'Order' });
    await marks.beat('back-to-order', found.ok ? `order ${ORDER}, found by number` : found.why);
    if (!found.ok) throw new Error(found.why);
    const toGraph = await switchDocumentMode(page, cursor, 'graph-mode', { settle: 2200 });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(3000);
    await zoomToFit(page, cursor);
    await marks.beat('graph-again', toGraph ? 'the same order, as a graph' : 'graph not offered');
    await sleep(800);

    // ── expand across the document boundary ─────────────────────────────────
    // One expansion, not several. The force layout keeps moving after each one, so a
    // coordinate read a second ago is already stale by the time the pointer arrives —
    // the second double-click misses more often than it lands, and a missed gesture
    // on camera is worse than a shorter scene. One is the beat: the graph grows, and
    // what arrives came from somewhere else.
    let expandedUri = null;
    for (let i = 0; i < 1; i++) {
      const node = await foreignNode(page, `${opts.base}/orders/${ORDER}/`, {
        skip: 0,
        // the parties, not the container's saved queries
        prefer: /\/(customers|employees|products|shippers)\//,
      });
      if (!node || node.error) { await marks.beat(`expand-${i + 1}`, node?.error ?? 'no node'); break; }
      const r = await expand(page, cursor, node);
      if (r.ok) expandedUri = node.id;
      await marks.beat(`expand-${i + 1}`, r.ok
        ? `${node.id.split('/').filter(Boolean).slice(-2).join('/')} — +${r.gained} nodes, +${r.links} links, from another document`
        : 'the double-click did not take');
      await sleep(900);
    }
    await zoomToFit(page, cursor);
    await sleep(1200);
    await shot('expanded');

    const finalState = await graphState(page);
    await marks.beat('reach', finalState ? `${finalState.nodes} nodes now — none of this is in the order's own document` : '?');
    await sleep(900);

    // ── and the graph is not a dead end ─────────────────────────────────────
    // The node that was just expanded now HAS a description, so a single click on it
    // renders that description into the info panel — and the description carries its
    // URI as an ordinary link. Clicking it opens the document. Found by URI rather
    // than by the coordinate it used to be at, because the expansion moved everything.
    let openedAt = null;
    if (expandedUri) {
      const again = await nodeById(page, expandedUri);
      if (again && !again.error) {
        const picked = await select(page, cursor, again);
        await marks.beat('details', picked.ok
          ? `${picked.href.replace(opts.base, '')} — a node is a resource, and it says so`
          : picked.why);
        await sleep(1300);

        if (picked.ok) {
          // In place, like every other link in the app — graph3d.xsl no longer opens a
          // browser tab for it. The graph is the route out of the order.
          const before = page.url().split('?')[0];
          if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 700, settle: 200, after: 400 });
          else await picked.link.click();
          await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 20_000 }).catch(() => {});
          await page.waitForLoadState('load').catch(() => {});
          await sleep(4000);
          const now = page.url().split('?')[0];
          if (now !== before) openedAt = now;
        }
      } else {
        await marks.beat('details', again?.error ?? 'lost the node after the expansion');
      }
    }
    await marks.beat('open', openedAt
      ? `and it opens the record: ${openedAt.replace(opts.base, '')}`
      : 'the link did not open a document');
    await sleep(1000);

    // ── write down what it touches ──────────────────────────────────────────
    // And back to the page being written the way the scene left it: breadcrumb up to
    // Root, then the page's own entry in the list there. Two clicks the viewer can
    // follow, not a cut. (Measured: the search does not yet return a page this new,
    // and the tree would not open from graph mode; the children list has it at once.)
    const upAgain = await crumbGo(page, cursor, 'Root');
    if (!upAgain.ok) throw new Error(upAgain.why);
    await sleep(600);
    const back = await listGo(page, cursor, TITLE);
    if (!back.ok) throw new Error(back.why);
    const home = await switchDocumentMode(page, cursor, 'content-mode', { settle: 1800 });
    await marks.beat('return', home === false ? 'mode switcher would not open' : 'back to the page being written, by Root and the list');

    const o1 = await addObject(page, cursor, type, null, { label: 'All orders', kind: 'View', mode: 'Table' });
    await marks.beat('embed', o1.ok ? 'the order book, embedded — one row per transaction' : o1.why);
    await sleep(900);

    const p2 = await addProse(page, cursor, type,
      finalState && opened
        ? `The links out of this one order reach ${finalState.nodes} resources in five documents: a customer, a sales rep, a shipper and the products. The order book row shows none of them.`
        : 'The links out of this one order reach resources in five documents.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(900);

    const scrolled = await scrollThrough(page, { duration: 5200 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(700);
    await marks.beat('end');
  },
}, {});
