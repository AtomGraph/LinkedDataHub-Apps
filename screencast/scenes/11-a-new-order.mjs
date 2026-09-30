// "A new order."
//
// Opens on a customer's page: their record and every order they have placed, listed by
// the derived "Orders from this customer" view, which carries a Create button. The order
// is booked there — customer already filled in, rep picked by name — and the same list
// is read again: one row more. Which customer, and which number the order gets, are
// read from the data at start.
//
//   make scene SCENE=11-a-new-order BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep, must, until } from '../lib/harness.mjs';
import { deleteByTitle, removeAll } from '../lib/fixture.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { createItem, createFromView } from '../lib/constructors.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const TITLE = 'A new order';
const CUSTOMER = 'Gourmet Lanchonetes';
const REP = 'Peacock';
const TODAY = new Date().toISOString().slice(0, 10);

// Last take's order is the one dated today (the demo's book ends in 1998); it goes
// first, so the number the scene picks is the same every time.
const stale = await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?doc WHERE { GRAPH ?doc { ?o a schema:Order ; schema:orderDate ?d FILTER(STR(?d) = "${TODAY}") } }`);
if (stale.length) {
  const gone = await removeAll({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, urls: stale.map((r) => r.doc) });
  // A survivor would be counted into c.orders below, and the closing sentence with it.
  const kept = gone.filter(([, ok]) => !ok).map(([u]) => u);
  if (kept.length) throw new Error(`cleanup: could not remove order(s) dated today: ${kept.join(', ')}`);
  console.log(`cleanup: removed ${gone.length} order(s) dated today`);
}

const [c] = await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?customer (COUNT(?o) AS ?orders) ?maxid WHERE {
  GRAPH ?g { ?customer schema:legalName "${CUSTOMER}" }
  GRAPH ?h { ?o a schema:Order ; schema:customer ?customer }
  { SELECT (MAX(?i) AS ?maxid) WHERE { GRAPH ?k { ?x a schema:Order ; schema:identifier ?i } } }
} GROUP BY ?customer ?maxid`);
if (!c) throw new Error(`${CUSTOMER} not found`);
const ORDER_ID = String(Number(c.maxid) + 1);
const PAGE = c.customer.replace(/#.*$/, '');
console.log(`${CUSTOMER}: ${c.orders} orders; next order number ${ORDER_ID}`);

for (const t of [TITLE, ORDER_ID]) {
  const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: t });
  console.log(`cleanup: removed ${gone.removed.length} earlier "${t}"`);
}
const OPENS_ON = PAGE;
let url = null;

await runScene({
  id: '11-a-new-order',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    const ordersView = () => page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Orders from this customer' }).first();
    const count = async () => (await ordersView().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 })).trim();

    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await until(ordersView().locator('.ldh-view-toolbar .count b').first().waitFor({ state: 'visible', timeout: 25_000 }), "the customer's orders count");
    await sleep(800);
    await marks.beat('customer', `${CUSTOMER} — ${await count()} orders, listed on their own page`);
    await sleep(2600);

    // ── say why, before the work ────────────────────────────────────────────
    must(await crumbGo(page, cursor, 'Root'), 'up to Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.step('create', made, `a new page, ${TITLE}`);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p1 = await addProse(page, cursor, type,
      `${CUSTOMER} phoned in an order. Their page lists every order they have placed, and the list carries a Create button, so the order is booked where it will be listed, with the customer already filled in.`);
    await marks.step('question', p1, 'the job, written down');
    await sleep(3200);

    // ── back to the customer, and the order booked from their own list ──────
    const back = await searchGo(page, cursor, CUSTOMER, { type: 'Company' });
    await marks.step('back-to-customer', back, `${CUSTOMER}, found by name`);
    const booked = await createFromView(page, cursor, {
      '^Title': ORDER_ID, '^Identifier': ORDER_ID, '^Order date': TODAY, '^Sales rep': [REP, 'Person'],
    }, { type, view: 'Orders from this customer' });
    must(booked, `order${booked.unmatched?.length ? ' (fields: ' + booked.unmatched.join(', ') + ')' : ''}`);
    await marks.beat('order', `order ${ORDER_ID} — ${TODAY}, ${REP}, customer prefilled${booked.unmatched?.length ? '; unfilled: ' + booked.unmatched.join(', ') : ''}`);
    await sleep(2400);

    // ── the same list, read again ───────────────────────────────────────────
    const link = page.locator('.ldh-pane.is-active .ldh-block a').filter({ hasText: CUSTOMER }).first();
    if (!(await link.count())) throw new Error('the order page does not link its customer');
    await cursor.click(link);
    await page.waitForLoadState('load').catch(() => {});
    await until(ordersView().locator('.ldh-view-toolbar .count b').first().waitFor({ state: 'visible', timeout: 25_000 }), "the customer's orders count, read again");
    await sleep(2500);
    await marks.beat('customer-again', `${CUSTOMER} — the same list, read again: ${await count()} orders`);
    await sleep(2600);

    // ── the page, with the order on it ──────────────────────────────────────
    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const o1 = await addObject(page, cursor, type, null, { label: ORDER_ID, kind: 'Order', mode: 'Properties' });
    await marks.step('embed', o1, 'the order, embedded');
    await sleep(1400);
    const p2 = await addProse(page, cursor, type,
      `Order ${ORDER_ID}, booked on ${TODAY} for ${CUSTOMER} by ${REP}. Their page listed ${c.orders} orders when this page was opened; it lists ${Number(c.orders) + 1} now.`);
    await marks.step('note', p2);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
