// "Who is carrying the load?"
//
// Opens on the employee grid — nine photographs, already rendered. That is the
// strongest frame this page produces and it is also where the question honestly
// starts, so nothing is lifted or trimmed to put it first.
//
// The page already answers who SELLS most: it carries a Sales by employee chart.
// What it does not answer is who COVERS most, and the two turn out to run opposite
// ways — the three reps with the most ground booked the fewest orders. Verified
// against the instance before scripting:
//
//   King 10 territories / 72 orders      Callahan  4 / 104
//   Buchanan 7 / 43                      Leverling 4 / 127
//   Dodsworth 7 / 43                     Peacock   3 / 156
//   Fuller 7 / 96                        Davolio   2 / 123
//   Suyama 5 / 67
//
// One SELECT carries both counts, so one chart shows the inversion — two series
// against the same axis, rather than two charts the viewer has to hold side by side.
//
//   make scene SCENE=01-who-carries-the-load BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { scrollThrough, glideTo } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/employees/`;

// Unindented, because the editor supplies the indentation itself.
//
// COUNT(DISTINCT …) over two OPTIONALs rather than two queries: without DISTINCT the
// two branches cross-multiply and every count is the product. Read back against the
// endpoint before scripting — the nine rows above are what this returns.
//
// The axis is the family NAME and not the employee URI: a chart axis bound to a
// URI-valued variable renders raw markup (FINDINGS.md #3).
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?rep (COUNT(DISTINCT ?territory) AS ?territories) (COUNT(DISTINCT ?order) AS ?orders)
WHERE {
GRAPH ?g {
?employee schema:familyName ?rep .
}
OPTIONAL {
GRAPH ?h {
?employee schema:areaServed ?territory .
}
}
OPTIONAL {
GRAPH ?i {
?order schema:broker ?employee .
}
}
}
GROUP BY ?rep
ORDER BY DESC(?territories)`;

const TITLE = 'Who carries the load';
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
  id: '01-who-carries-the-load',
  target: OPENS_ON,
  warm: OPENS_ON,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks, base }) {
    // ── the grid, already rendered ──────────────────────────────────────────
    // The beat fires the moment the cards have photographs on them, not after a
    // dwell — that is what makes the head trim a measurement rather than a guess.
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    // Counting the photographs, not waiting for "an img": the navbar and the chart
    // block below both satisfy a bare img selector, and an earlier take opened on an
    // empty placeholder because one of them matched at 1.7s. An employee photo is a
    // content-addressed upload, so /uploads/ is what identifies it, and nine of them
    // are what "the grid has rendered" means here — and `complete &&
    // naturalWidth` rather than presence, because the <img> elements exist in the DOM
    // a beat before they have painted, which is how a take opened on nine white boxes.
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')]
        .filter((i) => i.complete && i.naturalWidth > 0).length >= 9,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('team', 'nine people, with their photographs');
    await sleep(2200);

    // ── what the page already answers ───────────────────────────────────────
    // Sales by employee is on this page. It is the right chart for the wrong
    // question, which is the whole reason there is a scene here.
    await glideTo(page, 1400, 1400);
    await sleep(1600);
    await marks.beat('sales-chart', 'the chart it already carries: revenue per rep');
    await sleep(900);

    // ── the question the page does not answer ───────────────────────────────
    // Scrolled back, not reloaded. Re-navigating to the page you are already on is a
    // gesture nobody makes, and on camera it reads as the take having gone wrong.
    await glideTo(page, 0, 1100);
    await sleep(900);
    // details.ldh-pivot-bar is collapsed by default and a closed <details> renders no
    // content at all, so the summary is opened first — and only if it is not already.
    const bar = page.locator('details.ldh-pivot-bar').first();
    let pivoted = false;
    if (await bar.count()) {
      const summary = bar.locator('summary').first();
      await summary.scrollIntoViewIfNeeded();
      if (!(await bar.evaluate((e) => e.open))) {
        await cursor.click(summary);
        await sleep(600);
      }
      const pill = page.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Territory' }).first();
      if (await pill.count()) {
        await cursor.click(pill);
        await sleep(3600);
        pivoted = true;
      }
    }
    const count = (await page.locator('.ldh-view-toolbar .right .count b').first()
      .textContent().catch(() => '?')).trim();
    await marks.beat('pivot', pivoted ? `the ground they cover: ${count}` : 'Territory not offered by the pivot bar');
    await sleep(1200);

    // ── say why, before doing anything ──────────────────────────────────────
    // The question goes down FIRST. Everything after this is Properties mode and a
    // query editor, and a viewer who has not been told what is being asked is
    // watching SPARQL get typed for no stated reason. The blank page costs two
    // seconds here, in the middle, where it costs nothing.
    // No teleport. The viewer watches the route: up to Root by breadcrumb, then
    // Create ▸ Item, and the page this finding is written on comes into existence
    // where they can see it come from.
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);

    const p0 = await addProse(page, cursor, type,
      'The team page ranks nine reps by revenue booked. It does not record how many territories each rep covers. This page compares the two.');
    await marks.beat('question', p0.ok ? 'the question, written down' : p0.why);
    // Held before the mode switcher opens over it, and long enough that pacing's
    // threefold speed-up of a static stretch still leaves a sentence to read.
    await sleep(3200);

    // ── write the query ─────────────────────────────────────────────────────
    // Properties, because the Create menu is mode-gated: ContentMode offers only the
    // two block types.
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);

    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    await sleep(400);

    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `both counts in one question — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      const t = await fill(page, cursor, 'Title', 'Territories per rep');
      await marks.beat('title', t.ok ? 'Territories per rep' : t.why);
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — the question is a resource now' : s.why);
      await sleep(900);
    }

    // ── turn it into a chart ────────────────────────────────────────────────
    // GROUP BY and COUNT collapse rows into summaries with no resource behind them,
    // so every affordance a view exists for would be dead. Aggregates are chart
    // material — and the chart needs no constructor of its own: the saved query
    // block's own Create raises the form already bound to it.
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Territories per rep' }).first();

    // Both counts are series; the rep's name is the axis. Series first, then the type —
    // see configureChart, which is where the reason is written down.
    const cfg = await configureChart(page, cursor, queryRow, {
      type: 'Bar chart',
      category: 'rep',
      series: ['territories', 'orders'],
    });
    await marks.beat('chart-pane', cfg.ok ? 'territories and orders on the same axis' : cfg.why);
    await sleep(700);

    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    const raised = await createChart.count() > 0;
    if (raised) {
      await createChart.scrollIntoViewIfNeeded();
      await cursor.click(createChart);
      await sleep(2400);
      const tc = await fill(page, cursor, 'Title', 'Ground against orders');
      await marks.beat('new-chart', tc.ok ? 'Create, from the query’s own action bar — already bound to it' : tc.why);
      const s2 = await save(page, cursor);
      await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
      // Straight on to Content, with no dwell. The pane behind this has reset to its
      // invalid default and is showing a red banner (FINDINGS.md #9): the block offers
      // no tab to switch away to, and scrolling to escape it only keeps it in frame
      // longer — measured, 0.75s became 1.0s. So the scene does not linger, and the
      // remaining fraction of a second is the product's bug rather than the scene's.
      await sleep(250);
    } else {
      await marks.beat('new-chart', 'no Create on the query block');
    }

    // ── write it up ─────────────────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);

    const o1 = await addObject(page, cursor, type, null, { label: 'Ground against orders', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? 'the chart, embedded' : o1.why);
    await sleep(1000);

    const p1 = await addProse(page, cursor, type,
      'King covers ten territories and booked seventy-two orders. Peacock covers three and booked a hundred and fifty-six. The reps with the most territories book the fewest orders.');
    await marks.beat('note', p1.ok ? undefined : p1.why);
    await sleep(700);

    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
