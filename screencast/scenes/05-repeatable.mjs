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
import { addProse, addObject, copyUri, switchDocumentMode } from '../lib/blocks.mjs';
import { create, typeQuery, fill, save, field } from '../lib/constructors.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const SLUG = 'category-mix';

// Written the way a person writes SPARQL, and deliberately without indentation:
// the editor supplies that itself, and supplying our own would double it.
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?category (COUNT(?product) AS ?products)
WHERE {
GRAPH ?g {
?product a schema:Product ;
schema:category ?category .
}
}
GROUP BY ?category
ORDER BY DESC(?products)`;

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

  async body({ page, cursor, type, marks }) {
    // ── the question ────────────────────────────────────────────────────────
    await page.goto(url, { waitUntil: 'load' });
    await sleep(3500);
    await marks.beat('empty', 'a page for a question that keeps coming back');
    await sleep(900);

    await switchDocumentMode(page, cursor, 'content-mode');
    const p1 = await addProse(page, cursor, type,
      'How is the catalogue spread across categories? Asked every quarter, answered by hand every time.');
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(1400);

    // ── write the query ─────────────────────────────────────────────────────
    // Properties mode, because that is where the ontology's classes are offered.
    const props = await switchDocumentMode(page, cursor, 'read-mode');
    await marks.beat('properties', props ? 'switched to Properties — the classes live here' : 'mode switcher would not open');
    await sleep(1200);

    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    await sleep(900);

    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `the question, as SPARQL — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(1600);

      const t = await fill(page, cursor, 'Title', 'Products per category');
      await marks.beat('title', t.ok ? 'Products per category' : t.why);
      await sleep(800);

      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — the query is a resource now' : s.why);
      await sleep(1600);
    }

    // ── point a view at it ──────────────────────────────────────────────────
    // Both resources end up on this page with generated ids, so the copy names the
    // one it wants by the title beside it rather than taking whatever comes first.
    const queryRow = page.locator('.ldh-pane.is-active .ldh-block-row, .ldh-pane.is-active .row-main')
      .filter({ hasText: 'Products per category' }).last();
    const copiedQ = await copyUri(page, cursor, (await queryRow.count()) ? queryRow : undefined);
    await marks.beat('copy-query', copiedQ.ok ? (copiedQ.value ?? 'copied') : copiedQ.why);
    await sleep(1000);

    const cv = await create(page, cursor, 'View');
    await marks.beat('new-view', cv.ok ? 'a View, over that query' : cv.why);
    await sleep(900);

    if (cv.ok) {
      // The Query field by name — the View form's controls are not in a fixed order.
      const combo = field(page, 'Query', 'input:not([type=hidden]):visible');
      if (await combo.isVisible().catch(() => false)) {
        await cursor.click(combo);
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+V`);
        await sleep(1500);
      }
      const tv = await fill(page, cursor, 'Title', 'Category mix');
      await marks.beat('view-title', tv.ok ? `written to ${tv.into ?? 'the Title field'}` : tv.why);
      const s2 = await save(page, cursor);
      await marks.beat('save-view', s2.ok ? 'saved — a view anyone can render' : s2.why);
      await sleep(1600);
    }

    // ── put it back where the question was asked ────────────────────────────
    const viewRow = page.locator('.ldh-pane.is-active .ldh-block-row, .ldh-pane.is-active .row-main')
      .filter({ hasText: 'Category mix' }).last();
    const copiedV = await copyUri(page, cursor, (await viewRow.count()) ? viewRow : undefined);
    await marks.beat('copy-view', copiedV.ok ? (copiedV.value ?? 'copied') : copiedV.why);
    await sleep(1000);

    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(1400);

    const o1 = await addObject(page, cursor, type, null, { paste: true, mode: 'Table' });
    await marks.beat('embed', o1.ok ? 'the view, embedded as a table' : o1.why);
    await sleep(2200);

    const p2 = await addProse(page, cursor, type,
      'The answer is now part of the page. Nobody has to walk the path again.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(1400);

    const scrolled = await scrollThrough(page, { duration: 6000 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(1200);

    await marks.beat('end');
    await sleep(800);
  },
});
