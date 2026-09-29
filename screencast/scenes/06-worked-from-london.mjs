// "Worked from London."
//
// Opens on the employee grid — nine photographs, already rendered — and switches the
// view to Map: two clusters, one around Seattle, one in London. Every sales territory
// is in the United States. Verified before scripting: four of the nine reps sit in
// London and between them hold twenty-nine of the forty-nine territories that have a
// rep at all. The London pin is the route in — it opens the rep, and the rep's page
// lists the ground.
//
//   make scene SCENE=06-worked-from-london BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle, patchDocument } from '../lib/fixture.mjs';
import { editResource, removeValue, addValue, pickAddedValue, saveForm } from '../lib/editing.mjs';
import { crumbGo, listGo, searchGo } from '../lib/nav.mjs';
import { addProse, addObject, pickByLabel, switchDocumentMode } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, field } from '../lib/constructors.mjs';
import { switchViewMode } from '../lib/modes.mjs';
import { clickMarker } from '../lib/map.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/employees/`;
const TITLE = 'Worked from London';

// Unindented: the editor supplies the indentation itself. The territory RESOURCE is
// selected so the view can plot it — every one carries geo:lat/long.
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?territory ?name
WHERE {
GRAPH ?g {
?rep schema:address ?address ;
schema:areaServed ?territory .
?address schema:addressLocality "London" .
}
GRAPH ?h {
?territory schema:name ?name .
}
}
ORDER BY ?name`;

const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
// The London reps, read from the data: their pins are the ones to open.
const LONDON = (await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?rep WHERE { GRAPH ?g { ?rep schema:address ?a . ?a schema:addressLocality "London" } }`)).map((r) => r.rep);
if (!LONDON.length) throw new Error('no rep based in London');
// Last take handed Chicago from King to Peacock; both records go back first.
const [chi] = await sparql(base, `PREFIX schema: <https://schema.org/> SELECT ?t WHERE { GRAPH ?g { ?t a schema:City ; schema:name "Chicago" } }`);
const [king] = await sparql(base, `PREFIX schema: <https://schema.org/> SELECT ?e WHERE { GRAPH ?g { ?e a schema:Person ; schema:familyName "King" } }`);
const [peacock] = await sparql(base, `PREFIX schema: <https://schema.org/> SELECT ?e WHERE { GRAPH ?g { ?e a schema:Person ; schema:familyName "Peacock" } }`);
if (!chi || !king || !peacock) throw new Error('Chicago, King or Peacock not found');
const doc = (u) => u.replace(/#.*$/, '');
for (const [who, update] of [
  [king.e, `PREFIX schema: <https://schema.org/> INSERT { <${king.e}> schema:areaServed <${chi.t}> } WHERE {}`],
  [peacock.e, `PREFIX schema: <https://schema.org/> DELETE { <${peacock.e}> schema:areaServed <${chi.t}> } WHERE {}`],
]) { const r = await patchDocument({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, url: doc(who), update }); console.log(`reset ${doc(who)}: ${r.ok ? 'ok' : r.out}`); }
let url = null;

await runScene({
  id: '06-worked-from-london',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    // ── the faces, already painted ──────────────────────────────────────────
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')].filter((i) => i.complete && i.naturalWidth > 0).length >= 9,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('team', 'nine people, with their photographs');
    await sleep(2200);

    // ── the same nine, plotted ──────────────────────────────────────────────
    // The view's own mode switcher, not the document's: the document-scope Map draws
    // what the container describes, which is links, not geometry.
    const toMap = await switchViewMode(page, cursor, 'map-mode');
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(2600);
    await marks.beat('map', toMap ? 'the same nine, plotted — two clusters, an ocean apart' : 'map not offered');
    await sleep(1200);

    // ── the pin in London ───────────────────────────────────────────────────
    const pin = await clickMarker(page, cursor, LONDON);
    const who = pin.ok ? (await page.locator('.ol-overlay-container a[title*="/employees/"]').first().textContent({ timeout: 4000 }).catch(() => '')).trim() : null;
    await marks.beat('london', pin.ok ? `${who} — the pin in London` : pin.why);
    await sleep(1400);

    // ── into the rep, from the pin ──────────────────────────────────────────
    const repLink = page.locator('.ol-overlay-container a[title*="/employees/"]').first();
    let rep = null;
    if (await repLink.count()) {
      await cursor.click(repLink);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(3800);
      rep = (await page.title().catch(() => '')).replace(/\s*[|–-]\s*Northwind Traders\s*$/i, '').trim() || who;
    }
    await marks.beat('rep', rep ? `${rep} — based in London; every territory on the page is in the United States` : 'the popup carried no link to the rep');
    await sleep(2600);

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
      'The team map shows two clusters: five reps around Seattle and four in London. Every sales territory is in the United States. This page finds the territories that are worked from London, and hands one of them to Seattle.');
    await marks.beat('question', p1.ok ? 'the question, written down' : p1.why);
    await sleep(3200);

    // ── the query, then the map of it ───────────────────────────────────────
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);
    const cs = await create(page, cursor, 'SELECT');
    await marks.beat('new-select', cs.ok ? 'a SELECT, created on this document' : cs.why);
    if (cs.ok) {
      const q = await typeQuery(page, cursor, QUERY);
      await marks.beat('query', q.ok ? `the London reps' ground, as SPARQL — ${q.lines} lines${q.verified ? ', read back and matching' : ''}` : q.why);
      await sleep(700);
      await fill(page, cursor, 'Title', 'London-served territories');
      const s = await save(page, cursor);
      await marks.beat('save-select', s.ok ? 'saved — twenty-nine rows' : s.why);
      await sleep(1000);
    }
    const cv = await create(page, cursor, 'View');
    await marks.beat('new-view', cv.ok ? 'a View over that query' : cv.why);
    if (cv.ok) {
      const queryField = field(page, 'Query', 'input:not([type=hidden]):visible');
      const picked = await pickByLabel(page, cursor, type, queryField, 'London-served territories', { kind: 'SELECT' });
      await marks.beat('bind', picked.ok ? 'bound to the query by name' : picked.why);
      const modeSelect = field(page, 'Layout mode', 'select:visible');
      if (await modeSelect.count()) { await modeSelect.scrollIntoViewIfNeeded(); await modeSelect.selectOption({ label: 'Map' }).catch(() => {}); await sleep(600); }
      await fill(page, cursor, 'Title', 'Territories worked from London');
      const s2 = await save(page, cursor);
      await marks.beat('save-view', s2.ok ? 'saved — rendered as a map' : s2.why);
      await sleep(1600);
    }

    // ── the answer, on the page ─────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(700);
    const o1 = await addObject(page, cursor, type, null, { label: 'Territories worked from London', kind: 'View', mode: 'Map' });
    await marks.beat('ground', o1.ok ? 'twenty-nine territories, plotted — none of them near London' : o1.why);
    await sleep(2600);

    // ── Chicago: off King's record, onto Peacock's ──────────────────────────
    const k = await searchGo(page, cursor, 'King', { type: 'Person' });
    if (!k.ok) throw new Error(k.why);
    const ed = await editResource(page, cursor, /Family name/);
    await marks.beat('king', ed.ok ? 'King — ten territories, open for editing' : ed.why);
    if (!ed.ok) throw new Error(ed.why);
    await sleep(900);
    const rm = await removeValue(page, cursor, ed.form, 'Territory', 'Chicago');
    if (!rm.ok) throw new Error(rm.why);
    const sv = await saveForm(page, cursor, ed.form);
    await marks.beat('unassign', sv.ok ? 'Chicago removed — nine' : sv.why);
    if (!sv.ok) throw new Error(sv.why);
    await sleep(1200);
    const pk = await searchGo(page, cursor, 'Peacock', { type: 'Person' });
    if (!pk.ok) throw new Error(pk.why);
    const ed2 = await editResource(page, cursor, /Family name/);
    if (!ed2.ok) throw new Error(ed2.why);
    await sleep(700);
    const av = await addValue(page, cursor, ed2.form, 'areaServed');
    if (!av.ok) throw new Error(av.why);
    const pv = await pickAddedValue(page, cursor, type, ed2.form, 'areaServed', 'Chicago', { kind: 'Territory' });
    if (!pv.ok) throw new Error(pv.why);
    const sv2 = await saveForm(page, cursor, ed2.form);
    await marks.beat('reassign', sv2.ok ? 'Peacock — Chicago added, from Seattle' : sv2.why);
    if (!sv2.ok) throw new Error(sv2.why);
    await sleep(1200);

    // ── the same map, read again ────────────────────────────────────────────
    const up2 = await crumbGo(page, cursor, 'Root');
    if (!up2.ok) throw new Error(up2.why);
    await sleep(600);
    const back2 = await listGo(page, cursor, TITLE);
    if (!back2.ok) throw new Error(back2.why);
    await page.waitForSelector('.ldh-pane.is-active .ldh-block .ldh-view-toolbar .count b', { timeout: 25_000 }).catch(() => {});
    await sleep(3000);
    const left = (await page.locator('.ldh-pane.is-active .ldh-block').filter({ hasText: 'Territories worked from London' }).first().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    await marks.beat('ground-again', `the same view, read again — ${left} territories worked from London`);
    await sleep(2600);
    const p2 = await addProse(page, cursor, type,
      'Twenty-nine of the forty-nine covered territories were served from London; Chicago now belongs to Peacock in Seattle, and the map above — the same query, run again — shows twenty-eight. King still holds nine.');
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
