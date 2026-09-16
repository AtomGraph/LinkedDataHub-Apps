// "Is our Beverages the same thing as theirs?"
//
// Opens on the category grid — eight tiles with photographs, already rendered, because
// /categories/ carries ac:GridMode on its view. That is the strongest frame this
// dataspace has after the map, and it is also what the scene is about: these are the
// labels being aligned.
//
// A vocabulary-alignment errand. The product categories are Northwind's own words;
// the UNESCO thesaurus is a published vocabulary. Reaching one from the other needs
// no export and no integration: the applications menu proxies the whole dataspace
// into this one's chrome, so a remote concept browses exactly like a local record.
//
// The page ends up carrying both sides of the alignment — our categories and the
// public concept — plus the sentence that connects them.
//
//   make scene SCENE=04-is-our-beverages-theirs BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { createItem } from '../lib/constructors.mjs';
import { addProse, addObject, copyUri, switchDocumentMode } from '../lib/blocks.mjs';
import { annotate } from '../lib/annotate.mjs';
import { treeGo, goToTab, searchGo, activeDocument, crumbGo } from '../lib/nav.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const SLUG = 'category-alignment';
// The category we are aligning, and the concept we expect to find by that name.
const TERM = 'Beverages';

const OPENS_ON = `${base}/categories/`;

const TITLE = 'Category alignment';
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
  id: '04-is-our-beverages-theirs',
  target: OPENS_ON,
  warm: OPENS_ON,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

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

    // ── the labels themselves ───────────────────────────────────────────────
    // The beat fires the moment the photographs are on the tiles, not after a dwell —
    // that is what makes the head trim a measurement rather than a guess.
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    // The photographs have to have PAINTED, not merely be in the DOM: the <img>
    // elements exist a beat before they decode, which is how a take opened on a grid
    // of white boxes. Eight tiles, eight content-addressed uploads.
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')]
        .filter((i) => i.complete && i.naturalWidth > 0).length >= 8,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('ours', 'our eight categories, as we label them');
    await sleep(2400);

    // ── the page being written ──────────────────────────────────────────────
    // Opened once there is something to put on it, and the grid goes in FIRST: a
    // sentence typed onto an empty page leaves the page empty for as long as the
    // typing takes, and the evidence is already to hand.
    // Up to Root by breadcrumb, then Create ▸ Item: the alignment page comes into
    // existence where the viewer can see it come from, instead of appearing by cut.
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);

    const inContent = await switchDocumentMode(page, cursor, 'content-mode');
    await marks.beat('content-mode', inContent ? 'switched to Content' : 'mode switcher would not open');
    await sleep(500);

    // The question leads. What follows is a trip into another dataspace and an RDFa
    // annotation, and neither reads as anything without the question already on the
    // page. It also has to exist before the annotation, which needs a sentence with
    // the term in it.
    const p1 = await addProse(page, cursor, type,
      'The eight tiles are the catalogue\u2019s own segments, and the words on them are Northwind\u2019s. Beverages is a label typed here, not a term another organisation would recognise. This page checks whether a published vocabulary has a concept for it, and whether that concept means the same thing.');
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(650);

    // Our own categories go in by name. There is no errand to fetch the URI, and
    // asking for the View rather than the Object it is wrapped in keeps the embed
    // from doubling its header.
    const o1 = await addObject(page, cursor, type, null, { label: 'All categories', kind: 'View', mode: 'Grid' });
    await marks.beat('embed-ours', o1.ok ? 'our categories, embedded as the evidence' : o1.why);
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
    //
    // Matched on a phrase from the sentence, not on TERM: the categories grid sits
    // above it and one of its eight tiles is also called Beverages, so filtering on
    // the term alone takes the grid and the pencil opens the wrong block.
    const prose = page.locator('.ldh-pane.is-active .ldh-block-row')
      .filter({ hasText: 'published vocabulary' }).first();
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
      `UNESCO's ${TERM} means the same thing as ours. It was never imported. It lives in another dataspace and is fetched when the page is rendered.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(650);

    const scrolled = await scrollThrough(page, { duration: 6500 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);

    await marks.beat('end');
    await sleep(400);
  },
});
