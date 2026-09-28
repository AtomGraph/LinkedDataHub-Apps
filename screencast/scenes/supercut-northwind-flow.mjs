// The supercut as one connected flow on Northwind — one recording, no page is reached
// by a goto after the first. The Employees view opens in Graph mode; a node blooms
// with its own document; the Territory pill pivots the graph to the 53 territories,
// the Region pill to the four regions; the Southern node opens the region's page. On
// that page: a city added through the form and its pin on the region's map; a SELECT
// typed and saved; a bar chart from it; Content mode; a sentence; the chart embedded
// as an Object; the sentence dragged below it. Beats mark the shots; the cut list
// picks the stretches. Fixtures run off camera before the browser exists and the
// view's mode is put back afterwards.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { patchDocument, clearBlocks } from '../lib/fixture.mjs';
import { create, typeQuery, fill, save, configureChart, openForm } from '../lib/constructors.mjs';
import { addProse, addObject, switchDocumentMode, contentModeUrl } from '../lib/blocks.mjs';
import { dragBlock } from '../lib/editing.mjs';
import { nodeById, expand, select, zoomToFit, approach } from '../lib/graph.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/employees/');
const { base, identity } = opts;
const auth = { ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile };
const EMPLOYEES = `${base}/employees/`, SOUTHERN = `${base}/regions/4/`;
const VIEW = `${EMPLOYEES}#select-employees-view`;
const TITLE = 'Reps by region';
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?region (COUNT(DISTINCT ?rep) AS ?reps)
WHERE {
GRAPH ?g {
?rep schema:areaServed ?territory .
}
GRAPH ?h {
?territory schema:containedInPlace ?place .
}
GRAPH ?i {
?place schema:name ?region .
}
}
GROUP BY ?region
ORDER BY DESC(?reps)`;
// The pointer travels to a control and a beat marks its arrival with the control's
// box, so the cut pans to it before the click (the shot's `via`).
const reach = async (cursor, marks, id, control, note) => { const c = await centre(control); await cursor.moveTo(c[0], c[1], { duration: 600 }); await sleep(250); await marks.beat(id, note, await focus(control)); };
const count = (scope) => scope.locator('.ldh-view-toolbar .count b').first().textContent().then((t) => t.trim()).catch(() => '');
const AC = 'PREFIX ac: <https://w3id.org/atomgraph/client#>';
const setMode = (mode) => patchDocument({ ...auth, url: EMPLOYEES, update: `${AC}\nDELETE { <${VIEW}> ac:mode ?m } INSERT { <${VIEW}> ac:mode ac:${mode} } WHERE { <${VIEW}> ac:mode ?m }` });

// ── fixtures, off camera ──────────────────────────────────────────────────────
console.log('  view → Graph:', JSON.stringify(await setMode('GraphMode')).slice(0, 120));
console.log('  Southern blocks cleared:', JSON.stringify(await clearBlocks({ ...auth, url: SOUTHERN })).slice(0, 120));
console.log('  old query/chart removed:', JSON.stringify(await patchDocument({ ...auth, url: SOUTHERN, update: `PREFIX dct: <http://purl.org/dc/terms/>\nDELETE { ?s ?p ?o } WHERE { ?s dct:title ${JSON.stringify(TITLE)} ; ?p ?o }` })).slice(0, 120));

try {
  await runScene({
    id: 'supercut-northwind-flow', target: EMPLOYEES, warm: EMPLOYEES, identity,
    geometry: geometryFrom(opts, GEOMETRY_2X),
    async body({ page, cursor, type, marks }) {
      // graph at zoom 1: fullscreen fills the 2880×1800 frame anyway, and the pointer's
      // hover proof on a node has only been shown to work unzoomed
      await load(page, EMPLOYEES, '.ldh-pane.is-active .ldh-view-toolbar canvas', 4000);
      await page.waitForFunction(() => { const gs = window.LinkedDataHub?.graphs ?? {}; return Object.values(gs).some((g) => { try { return (g.instance ?? g).graphData().nodes.length > 0; } catch { return false; } }); }, null, { timeout: 60_000 }).catch(() => console.log('  graph instance not seen'));
      const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
      await easeScrollTo(view, { ms: 800, margin: 24 }).catch(() => {});
      // the opening is the graph in fullscreen: the view's own Fullscreen button
      // maximises the canvas container (a `graph-3d-maximized` class, `client/graph3d.xsl`)
      const fsBtn = () => ui(page).locator('button.graph-3d-fullscreen').first();
      let fullscreen = false;
      if (await fsBtn().count()) {
        await cursor.click(fsBtn());
        fullscreen = await page.waitForFunction(() => !!document.querySelector('.graph-3d-maximized'), null, { timeout: 5000 }).then(() => true, () => false);
        console.log('  fullscreen:', fullscreen);
        await sleep(1200);
      }
      await zoomToFit(page, cursor); await sleep(2500);
      // ── 1 · an employee's node blooms with its own document ─────────────────
      let node = null;
      for (const id of [2, 5, 1, 3, 4, 6, 7, 8, 9]) { const n = await nodeById(page, `${EMPLOYEES}${id}/#this`); if (n && !n.error) { node = n; break; } }
      if (!node) throw new Error('no employee node in the view graph');
      const at = await approach(page, cursor, node.id, { fallback: node });
      const around = (p, r) => ({ focus: { x: Math.round(p.x - r), y: Math.round(p.y - r * 0.625), w: r * 2, h: Math.round(r * 1.25) } });
      await marks.beat('1-start', 'the employees as a graph; the pointer on one of them', around(at, 520));
      const r = await expand(page, cursor, node, { settle: 4000 });
      const at2 = await approach(page, cursor, node.id, { fallback: at });
      await marks.beat('1-end', r.ok ? `+${r.gained} nodes from the employee's own document` : r.why ?? 'no bloom', around(at2, 760));
      await sleep(600);
      // back into the page for the pivot bar: the same button, or Escape
      if (fullscreen) {
        if (await fsBtn().isVisible().catch(() => false)) await cursor.click(fsBtn()); else await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.graph-3d-maximized'), null, { timeout: 5000 }).catch(() => {});
        await sleep(800);
        await easeScrollTo(view, { ms: 800, margin: 24 }).catch(() => {});
      }
      // ── p1 · the Territory pill: the graph becomes the territories ──────────
      await zoomToFit(page, cursor); await sleep(1200);
      const bar = () => view.locator('details.ldh-pivot-bar').first();
      if (await bar().count() && !(await bar().evaluate((d) => d.open))) { await cursor.click(bar().locator('summary').first()); await sleep(900); }
      const pill1 = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Territory' }).first();
      await cursor.moveTo(...(await centre(pill1)), { duration: 700 }); await sleep(300);
      const c0 = await count(view);
      await marks.beat('p1-start', `${c0} employees; the pointer on the Territory pill`, await focus(view));
      await cursor.click(pill1);
      await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, c0, { timeout: 30_000 }).catch(() => {});
      await sleep(1000); await zoomToFit(page, cursor); await sleep(1500);
      await marks.beat('p1-end', `${await count(view)} territories, as a graph`, await focus(view));
      // ── p2 · the Region pill: four regions ──────────────────────────────────
      if (await bar().count() && !(await bar().evaluate((d) => d.open))) { await cursor.click(bar().locator('summary').first()); await sleep(900); }
      const pill2 = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Region' }).first();
      await cursor.moveTo(...(await centre(pill2)), { duration: 700 }); await sleep(300);
      const c1 = await count(view);
      await marks.beat('p2-start', 'the pointer on the Region pill', await focus(view));
      await cursor.click(pill2);
      await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, c1, { timeout: 30_000 }).catch(() => {});
      await sleep(1000); await zoomToFit(page, cursor); await sleep(1500);
      await marks.beat('p2-end', `${await count(view)} regions`, await focus(view));
      // ── 1b · the Southern node opens the region's page ──────────────────────
      const s = await nodeById(page, `${SOUTHERN}#this`);
      if (!s || s.error) throw new Error(s?.error ?? 'no Southern node');
      const picked = await select(page, cursor, { ...s });
      if (!picked.ok) throw new Error(picked.why);
      const panel = page.locator('[id^="info-content-"]').first();
      await marks.beat('1b-start', 'Southern selected; its link in the panel', await focus(view));
      await zoom2x(page); // the page it opens loads at 2×
      const before = page.url().split('?')[0];
      if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 500, settle: 150, after: 200 }); else await picked.link.click();
      await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 30_000 }).catch(() => {});
      await page.waitForSelector('.ldh-pane.is-active button.add-instance', { timeout: 60_000 }).catch(() => {});
      await sleep(1500);
      await marks.beat('1b-end', `the record: ${page.url().replace(base, '')}`);
      // ── 4 · a city through the form; its pin on the region's map ────────────
      const cities = ui(page).locator('.ldh-block[data-for-class]').filter({ hasText: 'Cities in this region' }).first();
      const addBtn = cities.locator('button.add-instance').first();
      await easeScrollTo(cities, { ms: 1200, margin: 24 }).catch(() => {}); await sleep(400);
      await cursor.moveTo(...(await centre(addBtn)), { duration: 600 }); await sleep(300);
      const before4 = await count(cities);
      await marks.beat('4-open', `${before4} cities on the map; the pointer on Create`, await focus(addBtn));
      await cursor.click(addBtn);
      const modal = ui(page).locator('.modal-constructor:visible, .ac-modal:visible').last();
      await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(900);
      await marks.beat('4-form', 'the City form, empty', await focus(modal));
      const n = String(Date.now()).slice(-3);
      for (const [re, val] of [['^Title', 'El Paso'], ['^Name', 'El Paso'], ['^Identifier', `79${n}`], ['Latitude|^Lat\\b', '31.7619'], ['Longitude|^Long\\b', '-106.4850']]) {
        const groups = modal.locator('.ldh-prop-group'); const c = await groups.count();
        for (let i = 0; i < c; i++) { const g = groups.nth(i); const label = ((await g.textContent()) ?? '').replace(/\s+/g, ' ').trim(); if (!new RegExp(re, 'i').test(label)) continue; const input = g.locator('input:not([type=hidden]):visible').first(); if (!(await input.count()) || await input.inputValue()) continue; await cursor.click(input); await input.pressSequentially(val, { delay: 35 }); break; }
      }
      const saveBtn = modal.locator('button').filter({ hasText: /Save|Create|check/ }).last();
      await saveBtn.scrollIntoViewIfNeeded();
      await cursor.moveTo(...(await centre(saveBtn)), { duration: 400 });
      await marks.beat('4-start', 'the form filled; the pointer on Save', await focus(modal));
      await cursor.click(saveBtn);
      await page.waitForFunction(() => ![...document.querySelectorAll('.modal-constructor, .ac-modal')].some((m) => m.offsetParent !== null), null, { timeout: 20_000 }).catch(() => {});
      await sleep(600);
      await marks.beat('4-saved', 'saved');
      const moved = await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, before4, { timeout: 10_000 }).then(() => true, () => false);
      await cities.locator('.ol-viewport canvas').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      await easeScrollTo(cities, { ms: 1400, margin: 24 }).catch(() => {});
      await sleep(1200);
      await marks.beat('4-end', `${await count(cities)} cities on the map (was ${before4}, re-read: ${moved})`, await focus(cities));
      await sleep(1500);
      // ── c0/c1 · Create ▸ SELECT; the query typed and saved ──────────────────
      await easeScrollTo(ui(page).locator('.ldh-pane.is-active').first(), { ms: 900, margin: 0 }).catch(() => {});
      await marks.beat('c0-start', 'the pointer to Create');
      await reach(cursor, marks, 'c0-ctl', ui(page).locator('button.drop-toggle').filter({ hasText: 'Create' }).first(), 'the pointer on the Create menu');
      const cs = await create(page, cursor, 'SELECT');
      if (!cs.ok) throw new Error(cs.why);
      const editor = ui(page).locator('.CodeMirror').first();
      const form = editor.locator('xpath=ancestor::form[1]');
      const q = await typeQuery(page, cursor, QUERY, {
        onAttempt: async (k) => marks.beat('c1-start', `an empty query form (attempt ${k})`, await focus(form)),
        onTyped: async () => marks.beat('c1-typed', 'the last character in', await focus(form)),
      });
      await marks.beat('c1-verified', q.ok ? 'the query, read back' : q.why, await focus(form));
      await fill(page, cursor, 'Title', TITLE);
      await reach(cursor, marks, 'c1-save', openForm(page).locator('button.btn-save, button[class*="btn-save"]').last(), 'the pointer on Save');
      const s1 = await save(page, cursor);
      const row = () => ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).first();
      await row().locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      await easeScrollTo(row(), { ms: 1400, margin: 40 }); await sleep(600);
      await marks.beat('c1-end', q.ok && s1.ok ? 'four rows' : (q.why ?? s1.why), await focus(row()));
      // ── c2 · a chart from it ────────────────────────────────────────────────
      await marks.beat('c2-start', 'the rows; chart type: Table', await focus(row()));
      const cfg = await configureChart(page, cursor, row(), { type: 'Bar chart', category: 'region', series: ['reps'] });
      await sleep(1200);
      await marks.beat('c2-drawn', cfg.ok ? 'bars in the pane' : cfg.why, await focus(row()));
      const createChart = row().locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
      await createChart.evaluate((el) => el.scrollIntoView({ block: 'center' })); await sleep(500);
      await reach(cursor, marks, 'c2-ctl', createChart, 'the pointer on the pane\'s Create');
      await cursor.click(createChart); await sleep(2000);
      await fill(page, cursor, 'Title', TITLE);
      await reach(cursor, marks, 'c2-save', openForm(page).locator('button.btn-save, button[class*="btn-save"]').last(), 'the pointer on Save');
      const s2 = await save(page, cursor);
      await sleep(600);
      const chartRow = () => ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).last();
      await easeScrollTo(chartRow(), { ms: 1400, margin: 40 }).catch(() => {}); await sleep(600);
      await marks.beat('c2-end', cfg.ok && s2.ok ? 'bars, saved as a chart' : (cfg.why ?? s2.why), await focus(chartRow()));
      // ── c3t · Content mode, from the document's mode toggle ─────────────────
      const xhtml = () => ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'XHTML' }).first();
      const toggle = ui(page).locator('button.layout-modes.drop-toggle, button[title="Mode"]').first();
      await easeScrollTo(ui(page).locator('.ldh-pane.is-active').first(), { ms: 900, margin: 0 }).catch(() => {}); await sleep(400);
      const tb = await toggle.boundingBox();
      const menuBox = tb ? { focus: { x: tb.x - 420, y: Math.max(0, tb.y - 30), w: tb.width + 520, h: 560 } } : null;
      await cursor.moveTo(...(await centre(toggle)), { duration: 600 }); await sleep(200);
      await marks.beat('c3t-start', 'Properties mode; the pointer on the mode toggle', menuBox);
      const item = ui(page).locator('.modes-pop a.mi.content-mode').first();
      for (let i = 0; i < 3 && !(await item.isVisible().catch(() => false)); i++) { await cursor.click(toggle); await sleep(700); }
      if (await item.isVisible().catch(() => false)) { await cursor.click(item); await xhtml().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {}); await sleep(500); }
      await marks.beat('c3t-end', (await xhtml().isVisible().catch(() => false)) ? 'Content mode' : 'the menu did not switch the mode', menuBox);
      for (let i = 0; i < 2 && !(await xhtml().isVisible().catch(() => false)); i++) { await page.keyboard.press('Escape').catch(() => {}); await switchDocumentMode(page, cursor, 'content-mode'); await sleep(1500); }
      if (!(await xhtml().isVisible().catch(() => false))) { console.log('  mode menu did not switch; loading the Content-mode URL'); await load(page, contentModeUrl(SOUTHERN), 'button', 2500); await xhtml().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {}); }
      await sleep(800);
      // ── c3 · a sentence ─────────────────────────────────────────────────────
      await marks.beat('c3-start', 'Content mode, an empty page');
      await reach(cursor, marks, 'c3-ctl', xhtml(), 'the pointer on + XHTML');
      const p1 = await addProse(page, cursor, type, 'Eastern has four reps on nineteen territories. Southern has two on eight.');
      await sleep(800);
      await marks.beat('c3-end', p1.ok ? 'the sentence, on the page' : p1.why, await focus(ui(page).locator('.ldh-block-row').first()));
      // ── c4 · the chart embedded beside it ───────────────────────────────────
      await marks.beat('c4-start', 'the pointer to + Object');
      await reach(cursor, marks, 'c4-ctl', ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first(), 'the pointer on + Object');
      const o1 = await addObject(page, cursor, type, null, { label: TITLE, kind: 'Result set chart' });
      await ui(page).locator('.ldh-block-row svg').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      await sleep(1200);
      await marks.beat('c4-end', o1.ok ? 'the chart, inside the page' : o1.why, await focus(ui(page).locator('.ldh-block-row').filter({ has: page.locator('svg') }).first()));
      // ── c5 · the sentence dragged below the chart ───────────────────────────
      const rows = ui(page).locator('.ldh-block-row').filter({ has: page.locator('span.ldh-bh-drag') });
      const prose = rows.first(), chart = rows.last();
      await easeScrollTo(ui(page).locator('.ldh-pane.is-active').first(), { ms: 900, margin: 0 }).catch(() => {}); await sleep(500);
      await marks.beat('c5-start', 'sentence above, chart below', await focus(prose, chart));
      const dr = await dragBlock(page, cursor, prose, chart);
      await sleep(1500);
      await marks.beat('c5-end', dr.ok ? 'chart above, sentence below' : dr.why, await focus(rows.first(), rows.last()));
      await sleep(3000);
      await marks.beat('end');
    },
  });
} finally {
  console.log('  view → Grid:', JSON.stringify(await setMode('GridMode')).slice(0, 120));
}
