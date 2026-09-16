// N5 — "Who else touches this order?"
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
import { resetDocument } from '../lib/fixture.mjs';
import { scrollThrough } from '../lib/frame.mjs';
import { expand, foreignNode, graphState, zoomToFit } from '../lib/graph.mjs';
import { searchGo } from '../lib/nav.mjs';

const opts = await resolve('/');
// newest-first listing, so the order has to be one the first page actually shows
const ORDER = '11074';

const { url } = await resetDocument({
  ...opts,
  container: opts.base + '/',
  slug: 'order-reach',
  title: 'What an order touches',
});
console.log(`fixture ready: ${url}`);

const { target, identity, ...a } = await resolve('/order-reach/');

await runScene({
  id: '06-who-touches',
  target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, type, marks, shot, base }) {
    // ── open on the data ────────────────────────────────────────────────────
    // Not on a blank page: the first frame has to be the best one available without
    // a gesture, and nobody creates an empty document and stares at it — you find
    // something first and write it up after.
    //
    // Opens on the order book. A row is all a table can show of a transaction, which is
    // exactly the limitation the graph is about to answer.
    await page.goto(`${base}/orders/`, { waitUntil: 'load' });
    await sleep(5200);
    await marks.beat('orderbook', 'eight hundred and thirty orders, one row each');
    await sleep(800);

    // the page being written is opened once there is something to write
    await page.goto(url, { waitUntil: 'load' });
    await sleep(2600);

    await switchDocumentMode(page, cursor, 'content-mode', { settle: 1500 });
    const p1 = await addProse(page, cursor, type,
      `Order ${ORDER} is one row in the order book. Who does it actually touch?`);
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(700);

    // ── the order itself ────────────────────────────────────────────────────
    // Search, not the listing: the order book is newest-first over 830 rows, and a
    // click on the row's resource link does not navigate — it resolves the fragment
    // in place, leaving the container on screen. Searching by the order number is
    // one gesture and lands on the document.
    const found = await searchGo(page, cursor, ORDER, { type: 'Order' });
    await marks.beat('order', found.ok
      ? `order ${ORDER} — a customer, a rep, a shipper, line items`
      : found.why);
    await sleep(900);
    console.log('      at:', page.url());

    // ── the shape a table cannot show ───────────────────────────────────────
    // An order is an item, so it carries no view block: this is the document-scope
    // graph, which renders what the document describes.
    const toGraph = await switchDocumentMode(page, cursor, 'graph-mode', { settle: 2200 });
    await sleep(4500);
    console.log('      url in graph mode:', page.url());
    await zoomToFit(page, cursor);

    const opened = await graphState(page);
    await marks.beat('graph', opened
      ? `${opened.nodes} nodes, ${opened.links} links — the order and everyone in it`
      : toGraph ? 'graph mode, no instance' : 'graph not offered');
    await sleep(900);

    // ── expand across the document boundary ─────────────────────────────────
    // One expansion, not several. The force layout keeps moving after each one, so a
    // coordinate read a second ago is already stale by the time the pointer arrives —
    // the second double-click misses more often than it lands, and a missed gesture
    // on camera is worse than a shorter scene. One is the beat: the graph grows, and
    // what arrives came from somewhere else.
    let gained = 0;
    for (let i = 0; i < 1; i++) {
      const node = await foreignNode(page, `${opts.base}/orders/${ORDER}/`, {
        skip: 0,
        // the parties, not the container's saved queries
        prefer: /\/(customers|employees|products|shippers)\//,
      });
      if (!node || node.error) { await marks.beat(`expand-${i + 1}`, node?.error ?? 'no node'); break; }
      const r = await expand(page, cursor, node);
      gained += r.gained;
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

    // ── write down what it touches ──────────────────────────────────────────
    const home = await switchDocumentMode(page, cursor, 'content-mode', { settle: 1800 });
    await page.goto(url, { waitUntil: 'load' });
    await sleep(3500);
    await marks.beat('return', home ? 'back to the page' : 'back');

    const o1 = await addObject(page, cursor, type, null, { label: 'All orders', kind: 'View', mode: 'Table' });
    await marks.beat('embed', o1.ok ? 'the order book, embedded' : o1.why);
    await sleep(900);

    const p2 = await addProse(page, cursor, type,
      finalState && opened
        ? `Following the links out of one order reaches ${finalState.nodes} resources across five documents — a customer, a sales rep, a shipper and the products. The row was never the whole story.`
        : 'Following the links out of one order reaches resources across five documents.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(900);

    const scrolled = await scrollThrough(page, { duration: 5200 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(700);
    await marks.beat('end');
  },
}, {});
