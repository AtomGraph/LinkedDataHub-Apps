// "One rep for the South."
//
// Opens on the territory map — fifty-three pins — and drills into a Southern one: the
// pin opens the territory, the territory's popup links to its region, and the region's
// page carries the list of its cities. Verified before scripting: Eastern has nineteen
// territories and four reps; Southern has eight territories and ONE rep, and four of
// its eight have nobody at all. The question is how many reps each region actually has.
//
//   make scene SCENE=07-one-rep-for-the-south BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { clickMarker } from '../lib/map.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/territories/`;
const TITLE = 'One rep for the South';

// The region's NAME is the axis: a chart axis bound to a URI renders raw markup
// (FINDINGS.md #3). COUNT(DISTINCT …) on both counts, or the OPTIONAL multiplies them.
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?region (COUNT(DISTINCT ?territory) AS ?territories) (COUNT(DISTINCT ?rep) AS ?reps)
WHERE {
GRAPH ?g {
?territory a schema:City ;
schema:containedInPlace ?place .
}
GRAPH ?h {
?place schema:name ?region .
}
OPTIONAL {
GRAPH ?i {
?rep schema:areaServed ?territory .
}
}
}
GROUP BY ?region
ORDER BY ?region`;

const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
// The Southern territories, read from the data: any of their pins leads to the region.
const SOUTHERN = (await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?t WHERE { GRAPH ?g { ?t schema:containedInPlace <${base}/regions/4/#this> } }`)).map((r) => r.t);
if (!SOUTHERN.length) throw new Error('no Southern territories');
let url = null;

await runScene({
  id: '07-one-rep-for-the-south',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-view-toolbar .right .count b', { timeout: 25_000 }).catch(() => {});
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    const total = (await page.locator('.ldh-view-toolbar .right .count b').first().textContent({ timeout: 4000 }).catch(() => '53')).trim();
    await marks.beat('map', `every territory Northwind covers: ${total}`);
    await sleep(2400);

    // ── a Southern pin, and out through its region ──────────────────────────
    const pin = await clickMarker(page, cursor, SOUTHERN);
    const name = pin.ok ? (await page.locator('.ol-overlay-container a[title*="/territories/"]').first().textContent({ timeout: 4000 }).catch(() => '')).trim() : null;
    await marks.beat('one', pin.ok ? `${name} — one of the Southern eight` : pin.why);
    await sleep(1400);

    const regionLink = page.locator('.ol-overlay-container a[title*="/regions/"]').first();
    let region = null;
    if (await regionLink.count()) {
      await cursor.click(regionLink);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(3600);
      region = (await page.title().catch(() => '')).replace(/\s*[|–-]\s*Northwind Traders\s*$/i, '').trim() || null;
      // the derived "Cities in this region" view arrives asynchronously — let it land
      await page.waitForSelector('.ldh-pane.is-active button.add-instance', { timeout: 20_000 }).catch(() => {});
      await sleep(1200);
    }
    await marks.beat('region', region ? `${region} — and its eight cities, listed on its own page` : 'the popup carried no region link');
    await sleep(2400);

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
      'The map plots fifty-three territories in four regions, and a region page lists its own. Nothing on either says how many reps a region has. This page counts territories and reps per region.');
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(3200);

    // ── the count, as a chart ───────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);
    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `territories and reps, per region — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      await fill(page, cursor, 'Title', 'Reps per region');
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — four rows' : s.why);
      await sleep(1000);
    }
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Reps per region' }).first();
    const cfg = await configureChart(page, cursor, queryRow, { type: 'Bar chart', category: 'region', series: ['territories', 'reps'] });
    await marks.beat('chart-pane', cfg.ok ? 'territories and reps on the same axis' : cfg.why);
    await sleep(700);
    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    if (await createChart.count()) {
      await createChart.scrollIntoViewIfNeeded();
      await cursor.click(createChart);
      await sleep(2400);
      await fill(page, cursor, 'Title', 'Reps per region');
      const s2 = await save(page, cursor);
      await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
      await sleep(250);
    } else {
      await marks.beat('save-chart', 'no Create on the query block');
    }

    // ── the answer, on the page ─────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);
    const o1 = await addObject(page, cursor, type, null, { label: 'Reps per region', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? 'the chart, embedded' : o1.why);
    await sleep(1200);
    const p2 = await addProse(page, cursor, type,
      'Eastern: nineteen territories, four reps. Western: fifteen, two. Northern: eleven, two. Southern: eight territories and one rep — and four of the eight have nobody at all.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
