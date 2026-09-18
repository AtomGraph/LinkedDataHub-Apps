// "Late: the customer or the shipper?"
//
// Opens on a late order in Graph mode — the customer, the rep, the shipper, the line
// items, on the dark canvas. The order book already charts late shipments by carrier.
// Nothing charts them by customer. The graph is the route: expand the customer node,
// select it, follow its link in place, and the customer's page lists every order they
// placed. Which order, and which customer, are read from the data at start — the
// customer with the most late orders, and one of those orders.
//
//   make scene SCENE=08-late-customer-or-shipper BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle, patchDocument } from '../lib/fixture.mjs';
import { editResource, retypeLocalName, saveForm } from '../lib/editing.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { expand, foreignNode, graphState, nodeById, select, zoomToFit } from '../lib/graph.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const TITLE = 'Late: the customer or the shipper?';

// Last take marked the late order delivered; the data goes back the way the scene
// found it before the pick is made, so the same order is late every time.
const RESET_ORDER = '10423';
const reset = await patchDocument({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  url: `${base}/orders/${RESET_ORDER}/`,
  update: `PREFIX schema: <https://schema.org/>
DELETE { <${base}/orders/${RESET_ORDER}/#this> schema:orderStatus schema:OrderDelivered }
INSERT { <${base}/orders/${RESET_ORDER}/#this> schema:orderStatus schema:OrderProblem }
WHERE {}` });
console.log(`reset: order ${RESET_ORDER} late again: ${reset.ok ? 'ok' : reset.out}`);

// Resolved from the data, not carried as constants — and by the same measure the chart
// at the end is sorted by, so the opening order's customer is the top of that chart.
const [pick] = await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?id ?cust ?orders ?late WHERE {
  { SELECT ?c (COUNT(?o) AS ?orders) (SUM(IF(?st = schema:OrderProblem, 1, 0)) AS ?late)
    WHERE { GRAPH ?g { ?o a schema:Order ; schema:customer ?c ; schema:orderStatus ?st } }
    GROUP BY ?c HAVING (COUNT(?o) >= 5)
    ORDER BY DESC(SUM(IF(?st = schema:OrderProblem, 1, 0)) / COUNT(?o)) LIMIT 1 }
  GRAPH ?g2 { ?o2 a schema:Order ; schema:identifier ?id ; schema:customer ?c ; schema:orderStatus schema:OrderProblem }
  GRAPH ?h { ?c schema:legalName ?cust }
} ORDER BY ?id LIMIT 1`);
if (!pick) throw new Error('no late order found');
const ORDER = pick.id, CUST = pick.cust;
console.log(`late order ${ORDER} of ${CUST} (${pick.late} of ${pick.orders} late)`);

const GRAPH_MODE = 'https://w3id.org/atomgraph/client#GraphMode';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent(GRAPH_MODE)}`;

const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?customer (COUNT(?order) AS ?orders) (SUM(IF(?status = schema:OrderProblem, 1, 0)) AS ?late)
WHERE {
GRAPH ?g {
?order a schema:Order ;
schema:customer ?account ;
schema:orderStatus ?status .
}
GRAPH ?h {
?account schema:legalName ?customer .
}
}
GROUP BY ?customer
HAVING (COUNT(?order) >= 5)
ORDER BY DESC(SUM(IF(?status = schema:OrderProblem, 1, 0)) / COUNT(?order))
LIMIT 10`;

const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
let url = null;

await runScene({
  id: '08-late-customer-or-shipper',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    // ── a late order, as a graph ────────────────────────────────────────────
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await zoomToFit(page, cursor);
    const opened = await graphState(page);
    await marks.beat('graph', opened ? `${opened.nodes} nodes — order ${ORDER}, delivered late` : 'graph not offered');
    await sleep(2400);

    // ── say why, before the work ────────────────────────────────────────────
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode', { settle: 1800 });
    const p1 = await addProse(page, cursor, type,
      `Order ${ORDER} shipped after its required date. Opened as a graph it shows everyone on it: the customer, the rep who booked it, the shipper who carried it. The order book charts late shipments by carrier. This page asks whether they follow the customer instead — and then marks this one delivered.`);
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(6500);

    // ── back to the graph, by search and the mode switcher ──────────────────
    const found = await searchGo(page, cursor, ORDER, { type: 'Order' });
    await marks.beat('back-to-order', found.ok ? `order ${ORDER}, found by number` : found.why);
    if (!found.ok) throw new Error(found.why);
    await switchDocumentMode(page, cursor, 'graph-mode', { settle: 2200 });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(1500);
    await zoomToFit(page, cursor);
    await marks.beat('graph-again', 'the same order, as a graph');
    await sleep(400);

    // ── the customer node: expand it, select it, follow it ──────────────────
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    if (!node || node.error) throw new Error(node?.error ?? 'no customer node');
    const r = await expand(page, cursor, node);
    await marks.beat('expand', r.ok ? `the customer — +${r.gained} nodes from their own document` : 'the double-click did not take');
    await zoomToFit(page, cursor);
    await sleep(1000);
    const again = await nodeById(page, node.id);
    if (again.error) throw new Error(again.error);
    const picked = await select(page, cursor, again);
    await marks.beat('details', picked.ok ? `${picked.href.replace(base, '')} — a node is a resource, and it says so` : picked.why);
    if (!picked.ok) throw new Error(picked.why);
    await sleep(1200);
    let landed = null;
    if (picked.ok) {
      const before = page.url().split('?')[0];
      if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 700, settle: 200, after: 400 });
      else await picked.link.click();
      await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 20_000 }).catch(() => {});
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 20_000 }).catch(() => {});
      await sleep(3000);
      const now = page.url().split('?')[0];
      if (now !== before) landed = now;
    }
    await marks.beat('customer', landed ? `${CUST} — and every order they placed, listed on their own page` : 'the link did not open the customer');
    if (!landed) throw new Error('the link did not open the customer');
    await sleep(2200);

    // ── the count, as a chart, on the page being written ────────────────────
    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const back = await listGo(page, cursor, TITLE);
    if (!back.ok) throw new Error(back.why);
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);
    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `late orders per customer — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      await fill(page, cursor, 'Title', 'Late orders by customer');
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved' : s.why);
      await sleep(1000);
    }
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Late orders by customer' }).first();
    const cfg = await configureChart(page, cursor, queryRow, { type: 'Bar chart', category: 'customer', series: ['late', 'orders'] });
    await marks.beat('chart-pane', cfg.ok ? 'late and total, per customer' : cfg.why);
    await sleep(700);
    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    if (await createChart.count()) {
      await createChart.scrollIntoViewIfNeeded();
      await cursor.click(createChart);
      await sleep(2400);
      await fill(page, cursor, 'Title', 'Late orders by customer');
      const s2 = await save(page, cursor);
      await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
      await sleep(250);
    }
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);
    const o1 = await addObject(page, cursor, type, null, { label: 'Late orders by customer', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? `the chart, embedded — ${CUST} on top, ${pick.late} of ${pick.orders}` : o1.why);
    await sleep(2400);

    // ── the order, marked delivered — and the chart, read again ─────────────
    const found2 = await searchGo(page, cursor, ORDER, { type: 'Order' });
    if (!found2.ok) throw new Error(found2.why);
    const ed = await editResource(page, cursor, /Order status/);
    await marks.beat('edit', ed.ok ? `order ${ORDER}, open for editing on its own page` : ed.why);
    if (!ed.ok) throw new Error(ed.why);
    await sleep(900);
    const st = await retypeLocalName(page, cursor, type, ed.form, 'Order status', 'OrderProblem', 'OrderDelivered');
    await marks.beat('delivered', st.ok ? 'OrderProblem → OrderDelivered, typed in place' : st.why);
    if (!st.ok) throw new Error(st.why);
    await sleep(1200);
    const sv = await saveForm(page, cursor, ed.form);
    await marks.beat('save-order', sv.ok ? 'saved' : sv.why);
    if (!sv.ok) throw new Error(sv.why);
    await sleep(800);
    const up2 = await crumbGo(page, cursor, 'Root');
    if (!up2.ok) throw new Error(up2.why);
    await sleep(600);
    const back2 = await listGo(page, cursor, TITLE);
    if (!back2.ok) throw new Error(back2.why);
    await sleep(4500);
    await marks.beat('chart-again', `the same chart, read again — ${CUST}: ${pick.late - 1} of ${pick.orders}`);
    await sleep(2600);
    const p2 = await addProse(page, cursor, type,
      `${CUST}: ${pick.orders} orders, ${pick.late} of them late when this page was opened, ${pick.late - 1} now that ${ORDER} is marked delivered — the chart above is the same query, run again. The order book charts which carrier is late; this page charts which customer is.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
