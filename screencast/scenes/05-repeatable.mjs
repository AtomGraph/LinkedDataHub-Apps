// Scenario N2 — "Make that finding repeatable."
//
// Exploring with facets answers a question once; the facet state is not saved, so
// next quarter somebody walks the same path again. This turns the finding into
// something the page holds: a SELECT that captures it, a View over that query, and
// the view embedded where the question was asked.
//
// The Create menu is mode-gated — ContentMode offers only the two block types, so
// the query and the view are created in Properties, which is where the ontology's
// classes live. Neither URI is known in advance: each is copied from the resource
// after it exists.
//
//   make scene SCENE=05-repeatable BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { create, typeQuery, fill, save, field } from '../lib/constructors.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const SLUG = 'category-mix';

// Written the way a person writes SPARQL, and deliberately without indentation:
// the editor supplies that itself, and supplying our own would double it.
// Northwind already answers "products per category" — it is a chart on /categories/,
// built from #products-per-category-query. Re-typing it would film a person solving a
// solved problem, so the scene asks something the dataspace cannot answer: which
// accounts have gone quiet. Verified against the instance before scripting — 26 rows,
// where "products never ordered" looked like a gap and returns none.
//
// The category is the customer's NAME rather than its URI: a chart axis bound to a
// URI-valued variable renders raw markup (FINDINGS.md #3).
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?name (COUNT(?order) AS ?orders)
WHERE {
GRAPH ?g {
?order a schema:Order ;
schema:customer ?customer .
}
GRAPH ?h {
?customer schema:legalName ?name .
}
}
GROUP BY ?name
HAVING (COUNT(?order) <= 5)
ORDER BY ?orders`;

const { url } = await resetDocument({
  ldh: opts.ldh,
  base,
  certFile: opts.certFile,
  certPassword: opts.certPassword,
  certPasswordFile: opts.certPasswordFile,
  container: `${base}/`,
  slug: SLUG,
  title: 'Category mix',
});
console.log(`fixture ready: ${url}`);

await runScene({
  id: '05-repeatable',
  target: url,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, type, marks, base }) {
    // ── the question ────────────────────────────────────────────────────────
    // ── open on the data ────────────────────────────────────────────────────
    // Not on a blank page: the first frame has to be the best one available without
    // a gesture, and nobody creates an empty document and stares at it — you find
    // something first and write it up after.
    //
    // Opens on the charts the customers page already carries. The point of the scene is
    // that they answer the wrong question: revenue is who pays us, not who has gone
    // quiet.
    await page.goto(`${base}/customers/`, { waitUntil: 'load' });
    await sleep(5600);
    await marks.beat('revenue', 'the account book — and the revenue chart it already carries');
    await sleep(800);

    // the page being written is opened once there is something to write
    await page.goto(url, { waitUntil: 'load' });
    await sleep(2600);

    await switchDocumentMode(page, cursor, 'content-mode');
    const p1 = await addProse(page, cursor, type,
      'Which accounts have gone quiet? Asked every quarter, answered by hand every time.');
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(650);

    // ── write the query ─────────────────────────────────────────────────────
    // Properties mode, because that is where the ontology's classes are offered.
    const props = await switchDocumentMode(page, cursor, 'read-mode');
    await marks.beat('properties', props ? 'switched to Properties — the classes live here' : 'mode switcher would not open');
    await sleep(550);

    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    await sleep(400);

    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `the question, as SPARQL — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);

      const t = await fill(page, cursor, 'Title', 'Quiet accounts');
      await marks.beat('title', t.ok ? 'Quiet accounts' : t.why);
      await sleep(400);

      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — the query is a resource now' : s.why);
      await sleep(700);
    }

    // ── turn it into a chart ────────────────────────────────────────────────
    // A view renders resources — rows you open, facet and pivot from. This query
    // GROUPs BY category and COUNTs, so its rows are summaries with no resource
    // behind them and every one of those affordances would be dead. Aggregates are
    // chart material.
    //
    // And the chart does not need a constructor of its own: the saved query block
    // opens on a Chart tab with a chart pane, and its own Create button raises a
    // Result set chart form with the query already bound and the pane's settings
    // carried across — so there is no URI to fetch and no second form to fill from
    // scratch.
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Quiet accounts' }).first();

    const chartType = queryRow.locator('select').first();
    if (await chartType.count()) {
      await chartType.scrollIntoViewIfNeeded();
      await chartType.selectOption({ label: 'Bar chart' }).catch(() => {});
      await sleep(900);
    }

    // The Series list arrives with every variable selected, the axis included — so
    // the chart would plot the customer name against itself beside the counts. The
    // name is the axis; orders is the only series.
    const series = queryRow.locator('select[multiple]').first();
    if (await series.count()) {
      await series.scrollIntoViewIfNeeded();
      await series.selectOption(['orders']).catch(() => {});
      await sleep(700);
    }
    await marks.beat('chart-pane', 'a bar chart of the counts — accounts across, orders up');
    await sleep(600);

    const createChart = queryRow.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    const raised = await createChart.count() > 0;
    if (raised) {
      await createChart.scrollIntoViewIfNeeded();
      await cursor.click(createChart);
      await sleep(2400);
    }
    await marks.beat('new-chart', raised ? 'Create, from the query\u2019s own action bar — the chart form opens already bound to it' : 'no Create on the query block');
    await sleep(500);

    if (raised) {
      const tc = await fill(page, cursor, 'Title', 'Quiet accounts');
      await marks.beat('chart-title', tc.ok ? 'Quiet accounts' : tc.why);
      const s2 = await save(page, cursor);
      await marks.beat('save-chart', s2.ok ? 'saved — a chart anyone can render' : s2.why);
      await sleep(700);
    }

    // ── put it back where the question was asked ────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(650);

    // Same again for the embed: the chart is named, so it is looked up rather than
    // fetched, and the kind rules out the Object that will wrap it.
    const o1 = await addObject(page, cursor, type, null, { label: 'Quiet accounts', kind: 'Result set chart' });
    await marks.beat('embed', o1.ok ? 'the chart, embedded where the question was asked' : o1.why);
    await sleep(1000);

    const p2 = await addProse(page, cursor, type,
      'The answer is now part of the page. Nobody has to walk the path again.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(650);

    const scrolled = await scrollThrough(page, { duration: 6000 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);

    await marks.beat('end');
    await sleep(400);
  },
});
