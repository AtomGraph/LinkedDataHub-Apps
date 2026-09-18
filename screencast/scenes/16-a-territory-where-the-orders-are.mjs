// "A territory where the orders are."
//
// Opens on the territory map: where Northwind has reps. It says nothing about where
// the orders go. A query counts US deliveries by city for cities with no territory —
// Boise, thirty-one orders, on top — and a territory is opened there, created from the
// region's own list. The chart is read again: Boise is gone from it. The map: one pin
// more. Which city, and which region, are read from the data at start.
//
//   make scene SCENE=16-a-territory-where-the-orders-are BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, createFromView, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/territories/`;
const TITLE = 'A territory where the orders are';
const REGION = 'Western';
// Boise: the city's own postcode and coordinates, as a person would look them up.
const CITY = { name: 'Boise', id: '83702', lat: '43.6150', long: '-116.2023' };

for (const t of [TITLE, CITY.name]) {
  const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: t });
  console.log(`cleanup: removed ${gone.removed.length} earlier "${t}"`);
}
const [top] = await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?city (COUNT(DISTINCT ?o) AS ?orders) WHERE {
  GRAPH ?g { ?o a schema:Order ; schema:orderDelivery ?d . ?d schema:deliveryAddress ?a . ?a schema:addressCountry "USA" ; schema:addressLocality ?city }
  FILTER NOT EXISTS { GRAPH ?h { ?t a schema:City ; schema:name ?city } }
} GROUP BY ?city ORDER BY DESC(?orders) LIMIT 1`);
if (!top || top.city !== CITY.name) throw new Error(`the top uncovered delivery city is ${top?.city}, not ${CITY.name}`);
console.log(`${CITY.name}: ${top.orders} US orders delivered there, no territory`);

const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?city (COUNT(DISTINCT ?order) AS ?orders)
WHERE {
GRAPH ?g {
?order a schema:Order ;
schema:orderDelivery ?delivery .
?delivery schema:deliveryAddress ?address .
?address schema:addressCountry "USA" ;
schema:addressLocality ?city .
}
FILTER NOT EXISTS {
GRAPH ?h {
?territory a schema:City ;
schema:name ?city .
}
}
}
GROUP BY ?city
ORDER BY DESC(?orders)
LIMIT 10`;
let url = null;

await runScene({
  id: '16-a-territory-where-the-orders-are',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    const mapCount = async () => (await page.locator('.ldh-view-toolbar .right .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-view-toolbar .right .count b', { timeout: 25_000 }).catch(() => {});
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    const before = await mapCount();
    await marks.beat('map', `${before} territories — where the reps are`);
    await sleep(2600);

    // ── say why, before the work ────────────────────────────────────────────
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p1 = await addProse(page, cursor, type,
      'The territory map shows where Northwind has reps. It says nothing about where the orders go. This page counts US deliveries by city for the cities with no territory, and opens one where most of them land.');
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(3200);

    // ── the count, as a chart ───────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);
    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    if (!cs.ok) throw new Error(cs.why);
    const q = await typeQuery(page, cursor, QUERY);
    await marks.beat('query', q.ok ? `US deliveries by city, no territory — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
    await sleep(700);
    await fill(page, cursor, 'Title', 'US deliveries with no territory');
    const s1 = await save(page, cursor);
    await marks.beat('save-select', s1.ok ? 'saved' : s1.why);
    await sleep(1000);
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'US deliveries with no territory' }).first();
    const cfg = await configureChart(page, cursor, queryRow, { type: 'Bar chart', category: 'city', series: ['orders'] });
    await marks.beat('chart-pane', cfg.ok ? `${CITY.name} on top — ${top.orders} orders, nobody there` : cfg.why);
    await sleep(700);
    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    if (!(await createChart.count())) throw new Error('no Create on the query');
    await createChart.scrollIntoViewIfNeeded();
    await cursor.click(createChart);
    await sleep(2400);
    await fill(page, cursor, 'Title', 'US deliveries with no territory');
    const s2 = await save(page, cursor);
    await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
    await sleep(250);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);
    const o1 = await addObject(page, cursor, type, null, { label: 'US deliveries with no territory', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? 'the chart, embedded' : o1.why);
    await sleep(2400);

    // ── a territory, opened where the orders land ───────────────────────────
    const region = await searchGo(page, cursor, REGION, { type: 'Region' });
    await marks.beat('region', region.ok ? `${REGION} — and its cities, listed on its own page with a Create button` : region.why);
    if (!region.ok) throw new Error(region.why);
    const opened = await createFromView(page, cursor, {
      '^Title': CITY.name, '^Name': CITY.name, '^Identifier': CITY.id, 'Latitude|^Lat\\b': CITY.lat, 'Longitude|^Long\\b': CITY.long,
    }, { view: 'Cities in this region' });
    await marks.beat('boise', opened.ok ? `${CITY.name} — created from the region's own list` : opened.why);
    if (!opened.ok) throw new Error(opened.why);
    await sleep(2200);

    // ── the map, then the chart, read again ─────────────────────────────────
    let toMap = await crumbGo(page, cursor, 'Territories');
    if (!toMap.ok) { await crumbGo(page, cursor, 'Root'); await sleep(600); toMap = await listGo(page, cursor, 'Territories'); }
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(2500);
    await marks.beat('pin', `${await mapCount()} territories now — one more pin, in Idaho`);
    await sleep(2400);
    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await sleep(4500);
    await marks.beat('chart-again', `the same chart, read again — ${CITY.name} is no longer on it`);
    await sleep(2600);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p2 = await addProse(page, cursor, type,
      `${CITY.name} took ${top.orders} US orders with nobody there. It is a territory now, in ${REGION}, and the chart above — the same query, run again — starts with the next city down.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
