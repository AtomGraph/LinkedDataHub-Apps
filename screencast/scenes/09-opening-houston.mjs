// "Opening Houston."
//
// The sequel to 02. Southern has eight territories and one rep, and four of the eight
// have nobody. Northwind opens a ninth, in Houston — and the territory is created
// from the region's own list, whose Create button the ontology put there
// (client/block/view.xsl:493, a derived inverse view typed to schema:City). Opens on
// the territory map; a Southern pin leads to the region, the region's list carries
// the button, and the map is where the result lands.
//
//   make scene SCENE=09-opening-houston BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { createItem, createFromView } from '../lib/constructors.mjs';
import { clickMarker } from '../lib/map.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/territories/`;
const TITLE = 'Opening Houston';
const CITY = 'Houston';

for (const t of [TITLE, CITY]) {
  const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: t });
  console.log(`cleanup: removed ${gone.removed.length} earlier "${t}"`);
}
// The Southern territories, read from the data: any of their pins leads to the region.
const SOUTHERN = (await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?t WHERE { GRAPH ?g { ?t schema:containedInPlace <${base}/regions/4/#this> } }`)).map((r) => r.t);
if (!SOUTHERN.length) throw new Error('no Southern territories');
let url = null;

await runScene({
  id: '09-opening-houston',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-view-toolbar .right .count b', { timeout: 25_000 }).catch(() => {});
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    const total = (await page.locator('.ldh-view-toolbar .right .count b').first().textContent({ timeout: 4000 }).catch(() => '53')).trim();
    await marks.beat('map', `${total} territories, and the South is thin`);
    await sleep(2400);

    // ── a Southern pin → its region → the list with the button ──────────────
    const pin = await clickMarker(page, cursor, SOUTHERN);
    const name = pin.ok ? (await page.locator('.ol-overlay-container a[title*="/territories/"]').first().textContent({ timeout: 4000 }).catch(() => '')).trim() : null;
    await marks.beat('one', pin.ok ? `${name} — Southern` : pin.why);
    await sleep(1200);
    const regionLink = page.locator('.ol-overlay-container a[title*="/regions/"]').first();
    if (!(await regionLink.count())) throw new Error('no region link in the popup');
    await cursor.click(regionLink);
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active button.add-instance', { timeout: 25_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('region', 'Southern — eight cities, and a Create button on the list');
    await sleep(2400);

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
      'Southern has eight territories and one rep, and four of the eight have nobody on them. Northwind is opening a ninth, in Houston. The region page lists its cities and carries a Create button, so the territory is created where it will be listed.');
    await marks.beat('question', p1.ok ? 'the decision, written down' : p1.why);
    await sleep(3200);

    // ── back to the region, and create the city from its own list ───────────
    const back = await searchGo(page, cursor, 'Southern', { type: 'Place' });
    await marks.beat('back-to-region', back.ok ? 'Southern, found by name' : back.why);
    if (!back.ok) throw new Error(back.why);
    const made2 = await createFromView(page, cursor, {
      '^Title': CITY, '^Name': CITY, 'Identifier': '77001', 'Latitude|^Lat\\b': '29.7604', 'Longitude|^Long\\b': '-95.3698',
    }, { view: 'Cities in this region' });
    await marks.beat('houston', made2.ok
      ? `${CITY} — created from the region's own list${made2.unmatched?.length ? '; unfilled: ' + made2.unmatched.join(', ') : ''}`
      : `${made2.why}${made2.unmatched?.length ? '; fields: ' + made2.unmatched.join(', ') : ''}`);
    if (!made2.ok) throw new Error(made2.why);
    await sleep(2200);

    // ── the map, with one more pin ──────────────────────────────────────────
    // From the new city's page the breadcrumb reads Root › Territories › Houston;
    // from the region page (if Save stayed there) it is Root › the list.
    let toMap = await crumbGo(page, cursor, 'Territories');
    if (!toMap.ok) { await crumbGo(page, cursor, 'Root'); await sleep(600); toMap = await listGo(page, cursor, 'Territories'); }
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(2500);
    const now = (await page.locator('.ldh-view-toolbar .right .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    await marks.beat('pin', toMap.ok ? `${now} territories now — one more pin, in Texas` : toMap.why);
    await sleep(2400);

    // ── the page, with the map on it ────────────────────────────────────────
    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const o1 = await addObject(page, cursor, type, null, { label: 'All territories', kind: 'View', mode: 'Map' });
    await marks.beat('embed', o1.ok ? 'the map, embedded — Houston on it' : o1.why);
    await sleep(1400);
    const p2 = await addProse(page, cursor, type,
      `${CITY} is on the map. ${now} territories now, and Southern's ninth — created from the region's own list, with the region already filled in.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
