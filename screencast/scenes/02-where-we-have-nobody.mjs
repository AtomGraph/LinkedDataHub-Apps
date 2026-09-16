// "Where do we have nobody?"
//
// Opens on the territory map — 53 pins, already plotted, because /territories/ carries
// ac:MapMode on its view. That is the strongest frame the dataspace has and it is also
// the honest first step of the question, so nothing is lifted to the front.
//
// The answer is an absence, and an absence is the one thing a facet cannot show: a
// facet filters by a relation that exists. So the question becomes a query, the query
// becomes a view, and the view is rendered as a map — four pins where there were
// fifty-three. Verified against the instance before scripting:
//
//   53 territories, 49 with a rep
//   uncovered: Austin, Bentonville, Columbia, Dallas — all four in Southern,
//   which is half of that region's eight
//
//   make scene SCENE=02-where-we-have-nobody BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo } from '../lib/nav.mjs';
import { addProse, addObject, pickByLabel, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, field } from '../lib/constructors.mjs';
import { findMarkers, openMarker } from '../lib/map.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/territories/`;

// Unindented: the editor supplies the indentation, and supplying our own doubles it.
//
// The territory RESOURCE is selected, not just its name, because the map plots what
// the results point at — and all four carry geo:lat/geo:long, checked before scripting.
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?territory ?name
WHERE {
GRAPH ?g {
?territory a schema:City ;
schema:name ?name .
}
FILTER NOT EXISTS {
GRAPH ?h {
?rep schema:areaServed ?territory .
}
}
}
ORDER BY ?name`;

const TITLE = 'Where we have nobody';
// Last take's write-up document is removed off camera, by title — the document is
// created ON camera below, so its path is a UUID and there is no slug to reset by.
const gone = await deleteByTitle({
  ldh: opts.ldh, base, certFile: opts.certFile,
  certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  title: TITLE,
});
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
// The sequel (09-opening-houston) adds a territory; this scene's fifty-three is only
// true without it, so it goes too, off camera.
const houston = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: 'Houston' });
if (houston.removed.length) console.log('cleanup: removed Houston from the previous sequel take');
let url = null;

await runScene({
  id: '02-where-we-have-nobody',
  target: OPENS_ON,
  warm: OPENS_ON,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks, base }) {
    // ── the ground, already plotted ─────────────────────────────────────────
    // The beat fires the moment the map has painted, not after a dwell — that is what
    // makes the head trim a measurement rather than a guess.
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-view-toolbar .right .count b', { timeout: 25_000 }).catch(() => {});
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    const total = (await page.locator('.ldh-view-toolbar .right .count b').first()
      .textContent().catch(() => '53')).trim();
    await marks.beat('map', `every territory Northwind covers: ${total}`);
    await sleep(2400);

    // ── drill into one pin ──────────────────────────────────────────────────
    // The map is the instrument, not the scenery: a pin is the shortest route to the
    // record behind it, and the popup it opens carries that territory's own links —
    // including the region it belongs to, which is the dimension the answer lands on.
    const found = await findMarkers(page);
    const label = found.markers ? await openMarker(page, cursor, found.markers) : null;
    // The popup text runs the title into its type chip and icon ligatures, so the
    // heading anchor is asked for the name rather than scraping that string.
    // Short leash on every read: textContent() against a locator that matches nothing
    // waits the default 30s, and four of those is two minutes of a take spent
    // discovering the obvious.
    const pinName = await page.locator('.ol-overlay-container a[title*="/territories/"]').first()
      .textContent({ timeout: 4000 }).catch(() => null);
    await marks.beat('one', pinName ? `${pinName.trim()} — one of the fifty-three` : (found.error ?? 'no marker opened'));
    await sleep(1500);

    // ── and out again, into its region ──────────────────────────────────────
    // Territories are grouped, and the popup links straight through to the grouping.
    // Backlinks was the other candidate here and is the wrong instrument: on a
    // territory it answers with the content blocks that reference it, not with the rep
    // — because the rep→territory link is schema:areaServed and points the other way,
    // which is the same asymmetry that makes the gap unfacetable a moment later.
    const regionLink = page.locator('.ol-overlay-container a[title*="/regions/"]').first();
    const hasRegion = (await regionLink.count()) > 0;
    let region = null;
    if (hasRegion) {
      await cursor.click(regionLink);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(3600);
      // The document title, not a heading: it is set from dct:title and reading it
      // costs nothing, where guessing at the heading element costs a timeout.
      region = (await page.title().catch(() => ''))
        .replace(/\s*[|–-]\s*Northwind Traders\s*$/i, '').trim() || null;
    }
    await marks.beat('region', region
      ? `${region} — and territories are grouped into four of these`
      : hasRegion ? 'followed the region link, could not read the title' : 'the popup carried no region link');
    await sleep(1400);

    // ── the question a facet cannot answer ──────────────────────────────────
    // Facets filter by a relation that exists. "Nobody serves this" is the absence of
    // one, so it has to be asked as a query. Properties, because the Create menu is
    // mode-gated and ContentMode offers only the two block types.
    // The question goes down first: everything after it is a query editor, and a
    // viewer who has not been told what is being asked is watching SPARQL for no
    // stated reason.
    // From the region page, up to Root by breadcrumb, then Create ▸ Item. The write-up
    // page comes into existence where the viewer can see it come from.
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
      'The territory map plots all fifty-three places Northwind sells into. Each rep is linked to the territories they serve, and the link runs from the rep. A territory nobody serves has no such link, so no facet and no map will single it out. This page finds them with a query.');
    await marks.beat('question', p1.ok ? 'why the map cannot answer this' : p1.why);
    // Held before the mode switcher opens: its popover lands on top of this sentence,
    // and a reader needs the sentence more than the menu.
    await sleep(3200);

    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);

    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    await sleep(400);

    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `the absence, as SPARQL — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      const t = await fill(page, cursor, 'Title', 'Uncovered territories');
      await marks.beat('title', t.ok ? 'Uncovered territories' : t.why);
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — four rows' : s.why);
      await sleep(1000);
    }

    // ── the same four, as a map ─────────────────────────────────────────────
    // These rows ARE resources — the query selects the territory itself — so this is
    // view material rather than chart material, and a view carries a layout mode.
    // Map plots what the results point at, which turns the answer into a picture of
    // the hole.
    const cv = await create(page, cursor, 'View');
    await marks.beat('new-view', cv.ok ? 'a View over that query' : cv.why);
    await sleep(500);

    let viewSaved = false;
    if (cv.ok) {
      // By property name, never by position: the first control on this form is the
      // query combobox, and a title typed there lands inside a URI.
      const queryField = field(page, 'Query', 'input:not([type=hidden]):visible');
      const picked = await pickByLabel(page, cursor, type, queryField, 'Uncovered territories', { kind: 'SELECT' });
      await marks.beat('bind', picked.ok ? 'bound to the query by name' : picked.why);
      await sleep(500);

      const modeSelect = field(page, 'Layout mode', 'select:visible');
      if (await modeSelect.count()) {
        await modeSelect.scrollIntoViewIfNeeded();
        await modeSelect.selectOption({ label: 'Map' }).catch(() => {});
        await sleep(700);
      }
      await fill(page, cursor, 'Title', 'Where we have nobody');
      const s2 = await save(page, cursor);
      viewSaved = s2.ok;
      await marks.beat('save-view', s2.ok ? 'saved — rendered as a map' : s2.why);
      await sleep(1600);
    }

    // ── write it up ─────────────────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);

    const o1 = await addObject(page, cursor, type, null, { label: 'Where we have nobody', kind: 'View', mode: 'Map' });
    await marks.beat('hole', o1.ok ? 'the four, plotted — the hole itself' : o1.why);
    await sleep(1400);

    const p2 = await addProse(page, cursor, type,
      'Four territories have no rep: Austin, Bentonville, Columbia and Dallas. All four are in Southern, which has eight territories in total.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);

    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
