// "A rep moves to Seattle."
//
// Opens on the team grid, then the same nine on a map: four in London, five around
// Seattle. Suyama is moving. The map plots each rep at the coordinates on their record,
// so the move is two numbers edited on Suyama's own page — and the map, read again:
// three and six.
//
//   make scene SCENE=15-a-rep-moves-to-seattle BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle, patchDocument } from '../lib/fixture.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { switchViewMode } from '../lib/modes.mjs';
import { createItem } from '../lib/constructors.mjs';
import { editResource, setLiteral, saveForm } from '../lib/editing.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/employees/`;
const TITLE = 'A rep moves to Seattle';
const WHO = 'Suyama';
const LONDON = { lat: '51.5225', long: '-0.0857' };
const SEATTLE = { lat: '47.6062', long: '-122.3321' };

const [s] = await sparql(base, `PREFIX schema: <https://schema.org/> SELECT ?e WHERE { GRAPH ?g { ?e a schema:Person ; schema:familyName "${WHO}" } }`);
if (!s) throw new Error(`${WHO} not found`);
// Last take moved him; he goes back to London first.
const reset = await patchDocument({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  url: s.e.replace(/#.*$/, ''),
  update: `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>\nPREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
DELETE { <${s.e}> geo:lat ?a ; geo:long ?b }
INSERT { <${s.e}> geo:lat "${LONDON.lat}"^^xsd:float ; geo:long "${LONDON.long}"^^xsd:float }
WHERE { <${s.e}> geo:lat ?a ; geo:long ?b }` });
console.log(`reset: ${WHO} in London: ${reset.ok ? 'ok' : reset.out}`);
const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
let url = null;

await runScene({
  id: '15-a-rep-moves-to-seattle',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')].filter((i) => i.complete && i.naturalWidth > 0).length >= 9,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('team', 'nine people, with their photographs');
    await sleep(2200);
    const toMap = await switchViewMode(page, cursor, 'map-mode');
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(2600);
    await marks.beat('map', toMap ? 'the same nine, plotted — four in London, five around Seattle' : 'map not offered');
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
      `${WHO} is moving from the London office to Seattle. The team map plots each rep at the coordinates on their record, so the move is two numbers on ${WHO}'s page.`);
    await marks.beat('question', p1.ok ? 'the move, written down' : p1.why);
    await sleep(3200);

    // ── two numbers, on the record ──────────────────────────────────────────
    const k = await searchGo(page, cursor, WHO, { type: 'Person' });
    if (!k.ok) throw new Error(k.why);
    const ed = await editResource(page, cursor, /Family name/);
    await marks.beat('edit', ed.ok ? `${WHO} — ${LONDON.lat}, ${LONDON.long}; open for editing` : ed.why);
    if (!ed.ok) throw new Error(ed.why);
    await sleep(900);
    const a = await setLiteral(page, cursor, type, ed.form, 'Latitude', SEATTLE.lat);
    if (!a.ok) throw new Error(a.why);
    const b = await setLiteral(page, cursor, type, ed.form, 'Longitude', SEATTLE.long);
    if (!b.ok) throw new Error(b.why);
    const sv = await saveForm(page, cursor, ed.form);
    await marks.beat('moved', sv.ok ? `${SEATTLE.lat}, ${SEATTLE.long} — saved` : sv.why);
    if (!sv.ok) throw new Error(sv.why);
    await sleep(1400);

    // ── the same map, read again ────────────────────────────────────────────
    // Suyama's breadcrumb reads Root › Employees › Suyama: one click up is the team.
    const team = await crumbGo(page, cursor, 'Employees');
    if (!team.ok) throw new Error(team.why);
    await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 25_000 }).catch(() => {});
    await sleep(1200);
    await switchViewMode(page, cursor, 'map-mode');
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(2800);
    await marks.beat('map-again', 'the same map, read again — three in London, six around Seattle');
    await sleep(2800);

    const up2 = await crumbGo(page, cursor, 'Root');
    if (!up2.ok) throw new Error(up2.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const o1 = await addObject(page, cursor, type, null, { label: 'All employees', kind: 'View', mode: 'Map' });
    await marks.beat('embed', o1.ok ? 'the team map, embedded' : o1.why);
    await sleep(1400);
    const p2 = await addProse(page, cursor, type,
      `${WHO} is in Seattle: three reps in London now, six around Seattle. Two numbers changed on one record; the map is the same view, read again.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5000 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
