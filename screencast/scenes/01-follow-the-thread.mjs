// Scenario 1 — "What ground does Fuller's team cover?"
//
// A question someone would actually ask, answered by walking the data. Not a tour:
// every step follows from the one before it, and no control is touched because it
// exists. The mode changes twice, both times because the task wants a different
// view — faces when you are looking at people, a map when you are asking where.
//
//   Who is on the team?        → Grid, because they have photographs
//   Who is Fuller?             → open him; his page already carries his reports,
//                                his territories and the orders he brokered
//   Who reports to him?        → facet: 5 of 9
//   What do those five cover?  → pivot to Territory: 20
//   Where are they?            → Map, and open one
//   Which regions is that?     → pivot to Region: 3
//
// Answer: five reps, twenty territories, three regions — reached without writing a
// query, and each hop carries the filter that came before it.
//
// Every beat is synchronous: no background import, no completion signal, nothing
// that needs a reload.
//
//   make scene SCENE=01-follow-the-thread BASE=… CERT_FILE=… CERT_PASSWORD_FILE=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { frameTogether } from '../lib/frame.mjs';
import { findMarkers, openMarker, closeInfo } from '../lib/map.mjs';
import { switchViewMode, currentViewMode } from '../lib/modes.mjs';

const opts = await resolve('/employees/');
const { target, identity } = opts;

const MANAGER = 'Fuller';
const MANAGER_FACET = 2;   // [0] Family name, [1] Territory, [2] Reports to

await runScene({
  id: '01-follow-the-thread',
  target,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, marks }) {
    const toolbar = page.locator('.ldh-view-toolbar').first();
    const total = async () => (await page.locator('.ldh-view-toolbar .right .count b').first()
      .textContent().catch(() => '?')).trim();
    const modeToggle = () => page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first();
    const settle = (ms = 2200) => sleep(ms);

    // Skips the gesture when the mode is already in force — see lib/modes.mjs.
    async function switchMode(mode) {
      await toolbar.scrollIntoViewIfNeeded();
      return switchViewMode(page, cursor, mode);
    }

    const facetPill = (n) => page.locator('.ldh-view-toolbar .left .facet button.facet-pill').nth(n);

    // Escape does not dismiss the facet popover — it stays open and overlays
    // whatever the next beat touches. The pill is a toggle, so it is the close.
    async function closeFacet(n) {
      const pill = facetPill(n);
      if ((await pill.getAttribute('aria-expanded')) === 'true') {
        await cursor.click(pill);
        await sleep(400);
      }
    }

    // A hop: open the disclosure if it closed, take the named relation, report what
    // came back. The pills live inside details.ldh-pivot-bar, and a closed <details>
    // renders no content at all, so the summary comes first every time.
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
      await marks.beat(beat, note ? `${note}: ${n}` : `${relation}: ${n}`);
      return n;
    }

    // ── the team ────────────────────────────────────────────────────────────
    await page.goto(target, { waitUntil: 'load' });
    await toolbar.waitFor({ state: 'visible', timeout: 45_000 });
    await sleep(650);
    await marks.beat('open', `${await total()} people in the directory`);
    await sleep(700);

    // Grid, because the question is "who are these people" and they have faces.
    await switchMode('grid-mode');
    await marks.beat('who', 'Grid — the people, with their photographs');
    await sleep(1150);

    // ── look one up ─────────────────────────────────────────────────────────
    // Fuller specifically, because the next question is about his team. His page
    // carries the views his class declares — reports, territories, orders brokered
    // — none of which anyone wrote a page template for.
    const link = page.locator(`.ldh-block-body a[href*="/employees/"]`).filter({ hasText: MANAGER }).first();
    const row = (await link.count()) ? link : page.locator('.ldh-block-body a[href*="/employees/"]').first();
    if (await row.count()) {
      const label = (await row.textContent().catch(() => '')).trim().slice(0, 40);
      await cursor.click(row);
      await page.waitForLoadState('load');
      await sleep(1900);
      await marks.beat('lookup', `${label} — his reports, territories and orders, all declared`);
      await sleep(1150);

      await page.goBack({ waitUntil: 'load' });
      await toolbar.waitFor({ state: 'visible', timeout: 45_000 });
      await sleep(1000);
      await marks.beat('back', `${await total()} people`);
      await sleep(400);
    }

    // ── his team ────────────────────────────────────────────────────────────
    await cursor.click(facetPill(MANAGER_FACET));
    await page.waitForFunction(
      () => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'),
      null, { timeout: 20_000 },
    ).catch(() => {});
    await sleep(400);
    await marks.beat('facet-open', 'who reports to whom');
    await sleep(400);

    const opt = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').filter({ hasText: MANAGER }).first();
    if (await opt.count()) {
      await cursor.click(opt);
      await settle(2400);
    }
    await closeFacet(MANAGER_FACET);
    const team = await total();
    await marks.beat('team', `reports to ${MANAGER}: ${team} of 9`);
    await sleep(750);

    // ── what they cover ─────────────────────────────────────────────────────
    const territories = await hop('Territory', 'territories', `the ground those ${team} cover`);
    await sleep(700);

    // ── where ───────────────────────────────────────────────────────────────
    const mapped = await switchMode('map-mode');
    if (mapped) {
      await sleep(2000);
      // Keep the toolbar on screen: it carries the route taken to get here, and the
      // beats after this need its controls clickable.
      await frameTogether(page, toolbar, page.locator('.ol-viewport').first(), { prefer: 'controls' });
      await marks.beat('where', `${territories} territories, plotted`);
      await sleep(650);

      const found = await findMarkers(page);
      if (found.markers?.length) {
        const label = await openMarker(page, cursor, found.markers, { after: 2600 });
        await marks.beat('one-territory', label ?? `none of ${found.markers.length} pins opened`);
        await sleep(1000);
        await closeInfo(page);
      } else {
        await marks.beat('one-territory', found.error ?? 'no pins detected');
      }

      // Back to a tabular view before hopping again: the pivot bar is reachable in
      // map mode but the hop does not take, and the route would silently stall.
      const back = await switchMode('table-mode');
      await marks.beat('back-to-table',
        back === 'already' ? 'already tabular' : back ? `${await total()} territories` : 'mode menu would not open');
      await sleep(450);
    }

    // ── which regions ───────────────────────────────────────────────────────
    const regions = await hop('Region', 'regions', 'and those sit in');
    await sleep(800);

    const steps = await page.evaluate(() => [...document.querySelectorAll('.parallax-steps button.parallax-step')]
      .map((b) => b.querySelector('.val')?.textContent.trim()));
    await marks.beat('answer', `${team} reps → ${territories} territories → ${regions} regions  (${steps.join(' → ')})`);
    await sleep(1250);

    await marks.beat('end');
    await sleep(400);
  },
});
