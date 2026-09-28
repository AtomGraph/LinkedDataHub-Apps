// Supercut takes on LTLOD: one view through the layout modes (2) and a map popup (5),
// on a county's constituent units. 2× footage; each beat carries its focus box.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { switchViewMode, currentViewMode } from '../lib/modes.mjs';
import { findMarkers, openMarker } from '../lib/map.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
// The unit with the most constituent units whose page carries the map view.
const [top] = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/>
SELECT ?unit (COUNT(?s) AS ?n) WHERE {
  GRAPH ?g { ?s dct:isPartOf ?unit }
  GRAPH ?h { ?unit dct:isPartOf ?up }
  FILTER NOT EXISTS { GRAPH ?k { ?up dct:isPartOf ?upup } }
} GROUP BY ?unit HAVING (COUNT(?s) >= 5 && COUNT(?s) <= 60) ORDER BY DESC(?n) LIMIT 1`);
// A county: its parent is the top of the hierarchy, and it has a screenful of
// municipalities rather than the thousands of streets a municipality has.
if (!top) throw new Error('no unit with sub-units');
const PAGE = top.unit.replace(/#.*$/, '');
console.log(`unit: ${PAGE} (${top.n} sub-units)`);

await runScene({
  id: 'supercut-ltlod', target: PAGE, warm: PAGE, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    // The derived view carries no data-for-class here (dct:isPartOf has no range in this
    // ontology, so nothing is constructable); it is the block with a view toolbar.
    await load(page, PAGE, '.ldh-pane.is-active .ldh-block .ldh-view-toolbar', 4000);
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    await view.scrollIntoViewIfNeeded(); await sleep(800);

    // ── 2 · one view: Map → Grid → Table → Chart → Graph → Map ─────────────────
    await marks.beat('2-start', `${await currentViewMode(page)} — ${top.n} constituent units`, await focus(view));
    for (const [mode, ready] of [['grid-mode', '.ldh-grid-block, .card'], ['table-mode', 'table tbody tr'], ['chart-mode', 'svg rect, svg path, .chart'], ['graph-mode', 'canvas'], ['map-mode', '.ol-viewport canvas']]) {
      const r = await switchViewMode(page, cursor, mode, { settle: 600 });
      await view.locator(ready).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
      await sleep(1400);
      await marks.beat(`2-${mode}`, r === 'already' ? 'already' : mode, await focus(view));
    }
    await marks.beat('2-end', 'back on the map', await focus(view));
    await sleep(800);

    // ── 5 · a pin → the resource's own controls ───────────────────────────────
    await sleep(600);
    await marks.beat('5-start', 'the map', await focus(view));
    const found = await findMarkers(page);
    const label = found.markers ? await openMarker(page, cursor, found.markers, { after: 1500 }) : null;
    const popup = ui(page).locator('.ol-overlay-container').first();
    await marks.beat('5-end', label ? `popup: ${label}` : (found.error ?? 'no popup'), await focus(popup.or(view)));
    await sleep(800);
    await marks.beat('end');
  },
});
