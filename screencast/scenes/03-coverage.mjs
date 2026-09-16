// Scenario N3 — "Which of our suppliers cover the categories that matter?"
//
// A purchasing question with a standing answer: three categories carry a third of
// the catalogue, so who supplies them, and how much of the supplier base is that?
// The answer is written onto a page as it is found, so next quarter nobody has to
// walk the path again.
//
// Same shape as the briefing, different subject — and the same rules: no URI is
// known in advance, no gesture is performed when its state is already current, and
// navigation takes the shortest route the interface offers.
//
//   make scene SCENE=03-coverage BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { switchViewMode } from '../lib/modes.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;

const SLUG = 'supplier-coverage';
const CATEGORY_FACET = 2;                                  // [0] Name, [1] Provider, [2] Category
const CATEGORIES = ['Beverages', 'Condiments', 'Seafood'];

const { url } = await resetDocument({
  ldh: opts.ldh,
  base,
  certFile: opts.certFile,
  certPassword: opts.certPassword,
  certPasswordFile: opts.certPasswordFile,
  container: `${base}/`,
  slug: SLUG,
  title: 'Supplier coverage',
});
console.log(`fixture ready: ${url}`);

await runScene({
  id: '03-coverage',
  target: url,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, type, marks, base }) {
    const total = async () => (await page.locator('.ldh-view-toolbar .right .count b').first()
      .textContent().catch(() => '?')).trim();
    const settle = (ms = 2200) => sleep(ms);
    const facetPill = (n) => page.locator('.ldh-view-toolbar .left .facet button.facet-pill').nth(n);

    async function openFacet(n) {
      await cursor.click(facetPill(n));
      await page.waitForFunction(
        () => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'),
        null, { timeout: 20_000 },
      ).catch(() => {});
      await sleep(400);
    }
    async function closeFacet(n) {
      const pill = facetPill(n);
      if ((await pill.getAttribute('aria-expanded')) === 'true') {
        await cursor.click(pill);
        await sleep(400);
      }
    }
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

    // ── the question ────────────────────────────────────────────────────────
    // ── open on the data ────────────────────────────────────────────────────
    // Not on a blank page: the first frame has to be the best one available without
    // a gesture, and nobody creates an empty document and stares at it — you find
    // something first and write it up after.
    //
    // The clip opens on what the catalogue already shows — the grid and its charts —
    // because the question is about a gap in it.
    await page.goto(`${base}/products/`, { waitUntil: 'load' });
    await sleep(5200);
    await marks.beat('catalogue', 'seventy-seven products, and the charts the catalogue already carries');
    await sleep(800);

    // the page being written is opened once there is something to write
    await page.goto(url, { waitUntil: 'load' });
    await sleep(2600);

    const inContent = await switchDocumentMode(page, cursor, 'content-mode');
    await marks.beat('content-mode', inContent ? 'switched to Content' : 'mode switcher would not open');
    await sleep(550);


    const p1 = await addProse(page, cursor, type,
      'Three categories carry a third of the catalogue. Who supplies them?');
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(500);

    // ── the catalogue ───────────────────────────────────────────────────────
    // The view's URI is neither known nor guessed: the combobox is given its name
    // and the app resolves it, which spares the scene a trip to the catalogue and
    // back. The kind keeps the embed from wrapping an Object in another Object.
    const o1 = await addObject(page, cursor, type, null, { label: 'All products', kind: 'View' });
    await marks.beat('embed', o1.ok ? 'the catalogue, looked up by name and embedded' : o1.why);
    await sleep(900);

    // ── the three categories ────────────────────────────────────────────────
    const all = await total();
    await openFacet(CATEGORY_FACET);
    for (const want of CATEGORIES) {
      const opt = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').filter({ hasText: want }).first();
      if (!(await opt.count())) continue;
      await cursor.click(opt);
      await settle(2300);
    }
    await closeFacet(CATEGORY_FACET);
    const filtered = await total();
    await marks.beat('categories', `${CATEGORIES.join(', ')}: ${filtered} of ${all}`);
    await sleep(650);

    const p2 = await addProse(page, cursor, type,
      `${CATEGORIES.join(', ')} account for ${filtered} of ${all} products.`);
    await marks.beat('note-categories', p2.ok ? undefined : p2.why);
    await sleep(550);

    // ── who supplies them ───────────────────────────────────────────────────
    const covering = await hop('Provider', 'suppliers', 'suppliers behind those products');
    await sleep(650);

    // ── and how many suppliers are there in total? ──────────────────────────
    // Clearing the categories on the pivoted view answers it without leaving:
    // the filter was travelling with the pivot the whole time.
    await openFacet(CATEGORY_FACET);
    const clear = page.locator('.facet-pop:not(.sort-pop) .head button.clear').first();
    if (await clear.count()) {
      await cursor.click(clear);
      await settle(3000);
    }
    await closeFacet(CATEGORY_FACET);
    const everyone = await total();
    await marks.beat('all-suppliers', `${covering} of ${everyone} suppliers`);
    await sleep(700);

    const gap = Number(everyone) - Number(covering);
    const p3 = await addProse(page, cursor, type,
      Number.isFinite(gap)
        ? `Only ${covering} of our ${everyone} suppliers serve them — ${gap} do not.`
        : `${covering} suppliers serve them.`);
    await marks.beat('note-gap', p3.ok ? undefined : p3.why);
    await sleep(650);

    // ── evidence that survives a reload ─────────────────────────────────────
    // The block embedded above renders the plain catalogue when the page is next
    // opened, because facet and pivot state is not persisted — which would leave
    // the prose talking about suppliers beside a grid of products. The suppliers
    // have a view of their own, and embedding that keeps the page honest.
    // The embedding carries its own layout, so the page renders suppliers as a
    // table regardless of how that view is shown anywhere else.
    const o2 = await addObject(page, cursor, type, null, { label: 'All suppliers', kind: 'View', mode: 'Table' });
    await marks.beat('embed-suppliers', o2.ok ? 'the suppliers, embedded as a table' : o2.why);
    await sleep(1000);

    // ── read it back ────────────────────────────────────────────────────────
    const scrolled = await scrollThrough(page, { duration: 6500 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(650);

    await marks.beat('end');
    await sleep(400);
  },
});
