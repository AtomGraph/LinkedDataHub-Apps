// Scenario N4 — "Does our Beverages category mean what UNESCO means by it?"
//
// A vocabulary-alignment errand. The product categories are Northwind's own words;
// the UNESCO thesaurus is a published vocabulary. Reaching one from the other needs
// no export and no integration: the applications menu proxies the whole dataspace
// into this one's chrome, so a remote concept browses exactly like a local record.
//
// The page ends up carrying both sides of the alignment — our categories and the
// public concept — plus the sentence that connects them.
//
//   make scene SCENE=04-alignment BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { addProse, addObject, copyUri, switchDocumentMode } from '../lib/blocks.mjs';
import { annotate } from '../lib/annotate.mjs';
import { treeGo, goToTab, searchGo, activeDocument } from '../lib/nav.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const SLUG = 'category-alignment';
// The category we are aligning, and the concept we expect to find by that name.
const TERM = 'Beverages';

const { url } = await resetDocument({
  ldh: opts.ldh,
  base,
  certFile: opts.certFile,
  certPassword: opts.certPassword,
  certPasswordFile: opts.certPasswordFile,
  container: `${base}/`,
  slug: SLUG,
  title: 'Category alignment',
});
console.log(`fixture ready: ${url}`);

await runScene({
  id: '04-alignment',
  target: url,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, type, marks, base }) {
    // Every link is re-queried after a navigation: a locator resolved on the
    // previous page keeps matching a detached element and clicks nothing.
    const visibleLink = (text) =>
      page.locator('.ldh-block-body a:visible').filter({ hasText: text }).first();

    // Coming home from a proxied dataspace is a tab switch, not a navigation: the
    // address does not change, so anything that checks the URL is checking the
    // wrong thing. Falls back to browser back when no tab was opened.
    // Coming back from another dataspace is a tab switch, which leaves page.url()
    // untouched — so neither the switch reporting success nor the URL proves the
    // scene is home. The active pane has to be asked, because every write after this
    // point is issued against whichever pane is in front: three earlier takes
    // embedded the concept and wrote the closing paragraph into the UNESCO root
    // instead of this document, and every beat reported success while doing it.
    async function backTo(target, tabLabel) {
      const home = async () => {
        const at = await activeDocument(page);
        return !!at && at.startsWith(target);
      };
      await goToTab(page, cursor, tabLabel);
      await sleep(700);
      if (await home()) return true;

      for (let i = 0; i < 4 && !(await home()); i++) {
        await page.goBack({ waitUntil: 'load' }).catch(() => {});
        await sleep(750);
      }
      return home();
    }

    // ── the question ────────────────────────────────────────────────────────
    // ── open on the data ────────────────────────────────────────────────────
    // Not on a blank page: the first frame has to be the best one available without
    // a gesture, and nobody creates an empty document and stares at it — you find
    // something first and write it up after.
    //
    // Opens on the category grid: eight tiles with photographs, which is the strongest
    // frame this page produces without a gesture — and it is the thing being aligned.
    await page.goto(`${base}/categories/`, { waitUntil: 'load' });
    await sleep(5200);
    await marks.beat('ours', 'our eight categories, as we label them');
    await sleep(800);

    // the page being written is opened once there is something to write
    await page.goto(url, { waitUntil: 'load' });
    await sleep(2600);

    const inContent = await switchDocumentMode(page, cursor, 'content-mode');
    await marks.beat('content-mode', inContent ? 'switched to Content' : 'mode switcher would not open');
    await sleep(500);

    const p1 = await addProse(page, cursor, type,
      'Beverages is our own label. Does a published vocabulary have a concept for it, and is it the same thing?');
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(550);

    // ── our side ────────────────────────────────────────────────────────────
    // Our own categories go in by name. There is no errand to fetch the URI, and
    // asking for the View rather than the Object it is wrapped in keeps the embed
    // from doubling its header.
    const o1 = await addObject(page, cursor, type, null, { label: 'All categories', kind: 'View', mode: 'Grid' });
    await marks.beat('embed-ours', o1.ok ? 'our categories, looked up by name and embedded as a grid' : o1.why);
    await sleep(900);

    // ── the public side, through the proxy ──────────────────────────────────
    // The applications menu does not leave this dataspace: it fetches the other one
    // through the Linked Data proxy and renders it here, so a remote vocabulary is
    // browsed with the same chrome, the same tree and the same copy control.
    const apps = page.locator('button.btn-apps').first();
    if (await apps.count()) {
      await cursor.click(apps);
      await sleep(550);
      const unesco = page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first();
      if (await unesco.count()) {
        await cursor.click(unesco);
        await page.waitForLoadState('load').catch(() => {});
        await sleep(2700);
        await marks.beat('thesaurus', `a published vocabulary, rendered here: ${page.url().includes('uri=') ? 'through the proxy' : 'directly'}`);
        await sleep(700);
      } else {
        await marks.beat('thesaurus', 'no UNESCO entry in the applications menu');
      }
    }

    // 4,489 concepts, alphabetical, and Beverages is 368 in, so it is neither paged
    // to nor faceted to: a facet on the preferred label is a label facet, and those
    // hang (FINDINGS.md #1). Search is what a person reaches for here anyway, and it
    // is the thesaurus's own search — which also has to be told that the concept it
    // wants is a Concept in THIS dataspace, because the store is shared and
    // Northwind's own Beverages category answers to the same name.
    const found = await searchGo(page, cursor, TERM, { type: 'Concept' });
    await marks.beat('search', found.ok
      ? `${found.total} matches for ${TERM} — the thesaurus's own concept`
      : found.why);
    await sleep(1100); // a proxied resource finishes rendering after load fires

    if (found.ok) {
      const label = (found.label || '').split('\n').find((l) => l.trim()) || TERM;
      await marks.beat('concept', label.slice(0, 36));
      await sleep(700);
    }

    // ── bring it home ───────────────────────────────────────────────────────
    const home = await backTo(url, 'Category alignment');
    // Closing the proxy tab lands back on the document, but not necessarily in the
    // mode it was left in — and without ContentMode there are no add buttons.
    // The document tab kept its Content mode while the other tab was in front, so
    // switching back needs no mode change — switchViewMode-style, do not re-assert
    // what is already true.
    await sleep(550);
    await marks.beat('return', home
      ? 'back to the alignment page, in Content'
      : `lost — still on ${await activeDocument(page)}`);
    if (!home) throw new Error(`refusing to write: the active pane is ${await activeDocument(page)}, not ${url}`);

    // The concept was visited because that is the scenario — a remote resource
    // browsing like a local one — not because its URI had to be collected. Bringing
    // it home is a lookup by the name we just read off it, and the store is shared
    // across dataspaces, so the thesaurus's own concept answers from here.
    const o2 = await addObject(page, cursor, type, null, { label: TERM, kind: 'Concept', mode: 'Properties' });
    await marks.beat('embed-public', o2.ok ? 'the public concept, embedded beside ours' : o2.why);
    await sleep(1000);

    // ── record the alignment ────────────────────────────────────────────────
    // Up to here the page only puts the two side by side, and the closing sentence
    // claims a match that nothing in the data records. This writes it.
    //
    // Not through the resource form: that form is ontology-driven and its Add button
    // offers a schema:ProductGroup nothing but rdf:type. Prose annotation is not
    // constrained by the subject's class, which is why the original plan called for
    // the RDFa typeahead here.
    //
    // The concept's URI is copied FIRST: the overlay's object field is a plain URI
    // input with no typeahead, and clicking a copy control after opening the editor
    // takes the focus out of it and closes it.
    const conceptBlock = page.locator('.ldh-pane.is-active .ldh-block-row')
      .filter({ has: page.locator(`a[href*="unesco-thesaurus"]`) }).first();
    const copied = await copyUri(page, cursor, conceptBlock, { match: 'concept' });
    await marks.beat('copy-concept', copied.ok ? (copied.value ?? 'the concept URI, copied') : copied.why);
    await sleep(700);

    // The word can only be selected inside an open editor, so the prose block goes
    // into edit mode — the same pencil a person would reach for.
    const prose = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: TERM }).first();
    await prose.scrollIntoViewIfNeeded();
    await prose.hover();
    await sleep(500);
    await cursor.click(prose.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last());
    await sleep(3200);
    await marks.beat('edit-prose', 'the sentence, open for editing');

    const a = await annotate(page, cursor, type, { word: TERM, property: 'exact' });
    await marks.beat('align', a.ok
      ? `skos:exactMatch — our ${TERM} IS UNESCO's, recorded on the page`
      : a.why);
    await sleep(1100);

    const p2 = await addProse(page, cursor, type,
      `UNESCO's ${TERM} is the same idea as ours. It was never imported — it lives in another dataspace and is fetched on demand.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(650);

    const scrolled = await scrollThrough(page, { duration: 6500 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);

    await marks.beat('end');
    await sleep(400);
  },
});
