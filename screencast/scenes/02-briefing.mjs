// Scenario N1 — "Fuller asked for a briefing on his team's coverage."
//
// The workflow has a requester, a deliverable and an ending: a page that answers the
// question, written as it is found. Prose poses, an object shows, prose says what it
// means — the same interleaving the Northwind pages themselves use, so the result
// looks like it belongs.
//
// The briefing embeds the employees view and then facets and pivots it IN PLACE, so
// the work never leaves the page it is building. Nothing is explored in one tab and
// reported in another.
//
//   XHTML   "Andrew Fuller asked what ground his team covers."
//   Object  the employees view      → facet to his reports: 5
//   XHTML   "Five people report to him."
//                                   → pivot to Territory: 20
//   XHTML   "Between them they hold twenty territories."
//                                   → that block, as a map
//   XHTML   "Which fall into three regions."
//
// The document is reset through the ldh CLI before the browser context exists, so
// every take starts on an empty page and the setup is genuinely off camera.
//
//   make scene SCENE=02-briefing BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { switchViewMode } from '../lib/modes.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;

const SLUG = 'team-coverage-briefing';
const MANAGER = 'Fuller';
const MANAGER_FACET = 2;   // [0] Family name, [1] Territory, [2] Reports to

const { url } = await resetDocument({
  ldh: opts.ldh,
  base,
  certFile: opts.certFile,
  certPassword: opts.certPassword,
  certPasswordFile: opts.certPasswordFile,
  container: `${base}/`,
  slug: SLUG,
  title: 'Team coverage briefing',
});
console.log(`fixture ready: ${url}`);

await runScene({
  id: '02-briefing',
  target: url,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, type, marks }) {
    const total = async () => (await page.locator('.ldh-view-toolbar .right .count b').first()
      .textContent().catch(() => '?')).trim();
    const settle = (ms = 2200) => sleep(ms);

    async function hop(relation, beat, note) {
      const bar = page.locator('details.ldh-pivot-bar').first();
      const summary = bar.locator('summary').first();
      if (!(await summary.count())) return marks.beat(beat, 'no pivot bar — skipped');
      await summary.scrollIntoViewIfNeeded();
      if (!(await bar.evaluate((e) => e.open))) {
        await cursor.click(summary);
        await sleep(500);
      }
      const pill = page.locator('.ldh-pivot-pill:visible').filter({ hasText: relation }).first();
      if (!(await pill.count())) return marks.beat(beat, `${relation} not offered — skipped`);
      await cursor.click(pill);
      await settle(3400);
      const n = await total();
      await marks.beat(beat, `${note}: ${n}`);
      return n;
    }

    // ── open on the map ─────────────────────────────────────────────────────
    // The first frame is the best frame the app can produce without a single
    // gesture: /territories/ ships its view in MapMode, so the clip opens on a map
    // full of markers rather than on a blank page or a table. It is also exactly
    // what the question is about — the ground the team covers.
    await page.goto(`${base}/territories/`, { waitUntil: 'load' });
    await sleep(5200);
    await marks.beat('ground', 'every territory Northwind covers');
    await sleep(900);

    // ── whose ground? ───────────────────────────────────────────────────────
    // The map shows all of it. The question is which of it belongs to one manager's
    // team, and that is answered on the roster.
    await page.goto(`${base}/employees/`, { waitUntil: 'load' });
    await sleep(3200);
    await marks.beat('roster', 'nine people — who reports to whom');
    await sleep(600);

    // ── his team ────────────────────────────────────────────────────────────
    const facetPill = page.locator('.ldh-view-toolbar .left .facet button.facet-pill').nth(MANAGER_FACET);
    if (await facetPill.count()) {
      await cursor.click(facetPill);
      await page.waitForFunction(
        () => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'),
        null, { timeout: 20_000 },
      ).catch(() => {});
      await sleep(400);
      const opt = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').filter({ hasText: MANAGER }).first();
      if (await opt.count()) {
        await cursor.click(opt);
        await settle(2400);
      }
      if ((await facetPill.getAttribute('aria-expanded')) === 'true') {
        await cursor.click(facetPill);
        await sleep(400);
      }
      await marks.beat('team', `reports to ${MANAGER}: ${await total()}`);
      await sleep(700);
    } else {
      await marks.beat('team', 'no facets on the embedded view — skipped');
    }

    // ── what they cover ─────────────────────────────────────────────────────
    const territories = await hop('Territory', 'territories', 'the ground those five cover');
    await sleep(650);

    // ── where ───────────────────────────────────────────────────────────────
    const mapped = await switchViewMode(page, cursor, 'map-mode');
    await marks.beat('map',
      mapped === 'already' ? 'already a map — no gesture' : mapped ? 'the same block, as a map' : 'map mode not offered');
    await sleep(1600);

    // Territories are the only geo-coded step, so the map belongs here and the view
    // goes back to a table before hopping on — pivoting to Region under an open map
    // leaves it plotting resources that have no coordinates.
    await switchViewMode(page, cursor, 'table-mode');
    await sleep(400);

    // ── the answer ──────────────────────────────────────────────────────────
    const regions = await hop('Region', 'regions', 'and those sit in');
    await sleep(650);

    // ── now write it up ─────────────────────────────────────────────────────
    // The findings exist; the briefing is where they go. Opening it is opening a
    // bookmark — everything after goes through the interface.
    await page.goto(url, { waitUntil: 'load' });
    await sleep(2600);
    await marks.beat('briefing-page', 'the briefing, still empty');
    await sleep(400);

    const inContent = await switchDocumentMode(page, cursor, 'content-mode');
    await marks.beat('content-mode', inContent ? 'switched to Content' : 'mode switcher would not open');
    await sleep(500);

    const p1 = await addProse(page, cursor, type,
      'Andrew Fuller asked what ground his team covers.');
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(500);

    const o1 = await addObject(page, cursor, type, null, { label: 'All employees', kind: 'View' });
    await marks.beat('embed', o1.ok ? 'the team, embedded' : o1.why);
    await sleep(800);

    const p2 = await addProse(page, cursor, type,
      `Five of the nine report to him, and between them they hold ${territories ?? 'twenty'} territories in ${regions ?? 'three'} regions.`);
    await marks.beat('finding', p2.ok ? 'the finding, in words' : p2.why);
    await sleep(700);

    // ── evidence that survives a reload ─────────────────────────────────────
    // Facet and pivot state is not persisted, so the block embedded above renders
    // the plain roster when the page is next opened — which would leave the prose
    // claiming twenty territories beside a grid of nine people. The territories
    // have a view of their own, and embedding that keeps the page honest.
    // Layout mode belongs to the embedding, not to the shared view — so the
    // briefing keeps its map without changing how Territories renders elsewhere.
    const o2 = await addObject(page, cursor, type, null, { label: 'All territories', kind: 'View', mode: 'Map' });
    await marks.beat('embed-territories', o2.ok ? 'the territories, embedded as a map' : o2.why);
    await sleep(1000);

    // ── read it back ────────────────────────────────────────────────────────
    // Scrolled, not jumped: the embedded view is tall enough to hide everything
    // written after it, and the page only reads as a story in sequence.
    const scrolled = await scrollThrough(page, { duration: 7000 });
    await marks.beat('briefing', `read back over ${Math.round(scrolled)}px — question, evidence, findings`);
    await sleep(700);

    await marks.beat('end');
    await sleep(400);
  },
});
