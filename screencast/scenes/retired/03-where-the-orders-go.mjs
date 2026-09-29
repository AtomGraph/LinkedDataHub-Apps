// "Where do the orders actually go?"
//
// Opens on the dashboard the root document already carries — Monthly sales trend,
// Revenue by country, the territory map. A rendered chart is the first frame, and it
// is also the honest first step: you start a question like this from the numbers you
// already have.
//
// Revenue by country answers at country granularity. The sales territories are US
// cities, so the two never meet, and nothing on the page joins them. Verified against
// the instance before scripting:
//
//   122 US orders. 18 of them land in a city Northwind has a territory for —
//   Seattle 14, San Francisco 4. The other 104 go to Boise, Albuquerque, Portland,
//   Eugene, Anchorage, Lander … none of which is a territory.
//
// The reps are in the East; the orders are in the West.
//
//   make scene SCENE=03-where-the-orders-go BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { scrollThrough, glideTo } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/`;

// Unindented: the editor supplies the indentation itself.
//
// The axis is the city NAME, a literal — a chart axis bound to a URI-valued variable
// renders raw markup (FINDINGS.md #3).
const BY_CITY = `PREFIX schema: <https://schema.org/>

SELECT ?city (COUNT(DISTINCT ?order) AS ?orders)
WHERE {
GRAPH ?g {
?order schema:orderDelivery ?delivery .
}
GRAPH ?h {
?delivery schema:deliveryAddress ?address .
}
GRAPH ?i {
?address schema:addressLocality ?city ;
schema:addressCountry "USA" .
}
}
GROUP BY ?city
ORDER BY DESC(?orders)`;

// The join the dashboard cannot make: a delivery city against the territory list.
// Same literal on both sides, so the match is the city name itself.
const COVERED = `PREFIX schema: <https://schema.org/>

SELECT ?city (COUNT(DISTINCT ?order) AS ?orders)
WHERE {
GRAPH ?g {
?order schema:orderDelivery ?delivery .
}
GRAPH ?h {
?delivery schema:deliveryAddress ?address .
}
GRAPH ?i {
?address schema:addressLocality ?city ;
schema:addressCountry "USA" .
}
GRAPH ?j {
?territory a schema:City ;
schema:name ?city .
}
}
GROUP BY ?city
ORDER BY DESC(?orders)`;

const TITLE = 'Where the orders land';
// Last take's write-up document is removed off camera, by title — the document is
// created ON camera below, so its path is a UUID and there is no slug to reset by.
const gone = await deleteByTitle({
  ldh: opts.ldh, base, certFile: opts.certFile,
  certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  title: TITLE,
});
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
let url = null;

await runScene({
  id: '03-where-the-orders-go',
  target: OPENS_ON,
  warm: OPENS_ON,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks, base }) {
    // ── the numbers we already have ─────────────────────────────────────────
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-block-body svg, .ldh-block-body canvas', { timeout: 25_000 }).catch(() => {});
    await marks.beat('dashboard', 'the dashboard the home page already carries');
    await sleep(2400);

    // Revenue by country: the right answer to a coarser question.
    await glideTo(page, 900, 1500);
    await sleep(1800);
    await marks.beat('by-country', 'revenue by country — USA is one bar');
    await sleep(1200);

    // ── the question it does not answer ─────────────────────────────────────
    // The question goes down first: what follows is two query editors, and a viewer
    // who has not been told what is being asked is watching SPARQL for no reason.
    // Already at Root, so the write-up page is one Create ▸ Item away — no navigation
    // needed and none faked.
    await glideTo(page, 0, 900);
    await sleep(500);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);

    const p1 = await addProse(page, cursor, type,
      'The dashboard reports revenue by country, and the United States is one bar on it. The sales territories are individual cities, so a country total cannot show whether orders arrive where the reps are. This page counts the US orders by city.');
    await marks.beat('question', p1.ok ? 'why the dashboard cannot answer this' : p1.why);
    await sleep(700);

    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);

    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    await sleep(400);

    if (cs.ok) {
      const q = await typeQuery(page, cursor, BY_CITY);
      await marks.beat('query', q.ok ? `US deliveries, city by city — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      const t = await fill(page, cursor, 'Title', 'US orders by city');
      await marks.beat('title', t.ok ? 'US orders by city' : t.why);
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved' : s.why);
      await sleep(900);
    }

    // ── as a chart ──────────────────────────────────────────────────────────
    // COUNT and GROUP BY collapse rows into summaries with nothing to open, facet or
    // pivot, so this is chart material rather than view material. The chart is raised
    // from the query block's own action bar, already bound.
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'US orders by city' }).first();
    // Series before type: the pane opens with ?city selected as a series as well as the
    // category, which draws the city twice and then errors once the type is a chart.
    const cfg = await configureChart(page, cursor, queryRow, {
      type: 'Bar chart',
      category: 'city',
      series: ['orders'],
    });
    await marks.beat('chart-pane', cfg.ok ? 'Boise, Albuquerque, Portland — the west coast' : cfg.why);
    await sleep(800);

    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    if (await createChart.count()) {
      await createChart.scrollIntoViewIfNeeded();
      await cursor.click(createChart);
      await sleep(2400);
      await fill(page, cursor, 'Title', 'US orders by city');
      const s2 = await save(page, cursor);
      await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
      // Straight on to Content, with no dwell. The pane behind this has reset to its
      // invalid default and is showing a red banner (FINDINGS.md #9): the block offers
      // no tab to switch away to, and scrolling to escape it only keeps it in frame
      // longer — measured, 0.75s became 1.0s. So the scene does not linger, and the
      // remaining fraction of a second is the product's bug rather than the scene's.
      await sleep(250);
    } else {
      await marks.beat('save-chart', 'no Create on the query block');
    }

    // ── the join nothing on the dashboard makes ─────────────────────────────
    const cs2 = await create(page, cursor, 'SELECT');
    if (cs2.ok) {
      const q2 = await typeQuery(page, cursor, COVERED);
      await marks.beat('join', q2.ok ? 'the same deliveries, joined to the territory list' : q2.why);
      await sleep(700);
      await fill(page, cursor, 'Title', 'Orders landing in a territory');
      const s3 = await save(page, cursor);
      await marks.beat('covered', s3.ok ? 'two cities answer: Seattle and San Francisco' : s3.why);
      await sleep(1100);
    }

    // ── write it up ─────────────────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);

    const o1 = await addObject(page, cursor, type, null, { label: 'US orders by city', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? 'the chart, embedded' : o1.why);
    await sleep(1200);

    const p2 = await addProse(page, cursor, type,
      'A hundred and twenty-two orders ship to the United States. Eighteen of them arrive in a city Northwind has a territory for: Seattle and San Francisco. The other hundred and four arrive where no rep is assigned.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);

    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
