// Flow B of the overview — authoring, in one continuous take on a scratch document: a
// SELECT typed and saved, its results rendering (B1); a chart bound to it from its own
// block (B2); Content mode, a sentence typed in an XHTML block (B3); a word in it
// annotated with a link to the chart (B4); the chart embedded as an object block and
// dragged above the sentence (B5). The supercut's compose take, with the annotation
// added and the beats named after the script's shots.
//
// Dark, 2×, the pointer at a person's pace. The scratch document is reset off camera.
import { runScene, resolve, geometryFrom, sleep, must, until } from '../lib/harness.mjs';
import { resetDocument, removeAll } from '../lib/fixture.mjs';
import { create, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { addProse, addObject, revealControls, copyUri } from '../lib/blocks.mjs';
import { dragBlock } from '../lib/editing.mjs';
import { annotate } from '../lib/annotate.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo, easeScrollTop, zoomToFitRows } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const TITLE = 'Reps by region';
const SENTENCE = 'Eastern has four reps on nineteen territories; the chart shows the split.';
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
const doc = await resetDocument({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, container: base.endsWith('/') ? base : base + '/', slug: 'overview-compose', title: 'Coverage' });
const READ = `${doc.url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;
console.log('page:', doc.url);

await runScene({
  id: 'overview-b-author', target: READ, warm: READ, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    await load(page, READ, '.ldh-pane.is-active .ldh-view-toolbar, .ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 2500);

    // ── B1 · a SELECT, typed and saved; its results ────────────────────────────
    const cs = await create(page, cursor, 'SELECT');
    if (!cs.ok) throw new Error(cs.why);
    const editor = ui(page).locator('.CodeMirror').first();
    const form = editor.locator('xpath=ancestor::form[1]');
    const q = await typeQuery(page, cursor, QUERY, {
      onAttempt: async (n) => marks.beat('B1-start', `an empty query form (attempt ${n})`, await focus(form)),
      onTyped: async () => marks.beat('B1-typed', 'the last character in', await focus(form)),
    });
    await marks.step('B1-verified', q, 'the query, read back', await focus(form));
    const saveBtn = form.locator('button.btn-save, button[class*="btn-save"]').filter({ visible: true }).last();
    await easeScrollTo(saveBtn, { ms: 2000, block: 'end', margin: 0 }).catch(() => {});
    await sleep(300);
    await marks.beat('B1-scrolled', 'the form\'s foot in view: Title, Save', await focus(saveBtn));
    must(await fill(page, cursor, 'Title', TITLE), 'B1 title');
    await cursor.moveTo(...(await centre(saveBtn)), { duration: 600 });
    await marks.beat('B1-save', 'pointer on Save', await focus(saveBtn));
    await cursor.click(saveBtn);
    await marks.beat('B1-saved', 'saved');
    const row = () => ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).first();
    await until(row().locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 }), 'the saved query\'s rows');
    await easeScrollTo(row(), { ms: 1400, margin: 40 }); await sleep(600);
    await marks.beat('B1-end', 'the query block: Run, and the rows beneath', await focus(row()));
    await sleep(600);

    // ── B2 · a chart bound to it ───────────────────────────────────────────────
    await marks.beat('B2-start', 'the rows; chart type: Table', await focus(row()));
    const shown = await revealControls(page, cursor, row());
    if (!shown.ok) throw new Error(shown.why ?? 'the chart controls did not open');
    const cfg = await configureChart(page, cursor, row(), { type: 'Bar chart', category: 'region', series: ['reps'] });
    await sleep(1200);
    await marks.step('B2-drawn', cfg, 'bars in the pane', await focus(row()));
    const createChart = row().locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    await createChart.evaluate((el) => el.scrollIntoView({ block: 'center' })); await sleep(500);
    await cursor.click(createChart); await sleep(2000);
    must(await fill(page, cursor, 'Title', TITLE), 'B2 title');
    const s2 = await save(page, cursor);
    await sleep(600);
    const chartRow = () => ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).last();
    await easeScrollTo(chartRow(), { ms: 1400, margin: 40 }).catch(() => {}); await sleep(600);
    await marks.step('B2-end', s2, 'bars, saved as a chart', await focus(chartRow()));
    await sleep(600);

    // The chart's URI, for the annotation later: copied from its own block, never typed.
    // The block the save renders back is a degraded render — its copy control writes an
    // empty string, where the same control on a loaded document writes the URI (and the
    // graph take found the same render labelling rows by local name). A load of the
    // document has the real block; it sits here, at the shot boundary, where the cut is.
    await page.reload({ waitUntil: 'load' });
    await until(chartRow().waitFor({ state: 'visible', timeout: 30_000 }), 'the chart block, reloaded');
    await sleep(1500);
    // Clear of the sticky header, or the pointer's click on the hover-revealed control
    // lands on the header instead (measured: the block head scrolled to y=162 at 2×).
    await easeScrollTo(chartRow(), { ms: 1200, margin: 260 }).catch(() => {}); await sleep(500);
    let copied = { ok: false, value: null };
    for (let i = 0; i < 3 && !(copied.value && copied.value.startsWith('http')); i++) {
      await chartRow().hover(); await sleep(800);
      copied = await copyUri(page, cursor, chartRow());
      if (!copied.ok) throw new Error(`B4 prep: ${copied.why}`);
      if (!(copied.value && copied.value.startsWith('http'))) await sleep(1500);
    }
    if (!(copied.value && copied.value.startsWith('http'))) throw new Error(`B4 prep: the copy control put "${copied.value ?? ''}" on the clipboard`);
    console.log('  chart URI copied:', copied.value.replace(base, ''));
    await sleep(400);

    // ── B3 · Content mode: a sentence, typed ───────────────────────────────────
    const xhtml = () => ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'XHTML' }).first();
    const toggle = ui(page).locator('button.layout-modes.drop-toggle, button[title="Mode"]').first();
    await easeScrollTop(page, { ms: 1400 }); await sleep(600);
    const tb = await toggle.boundingBox();
    const menuBox = tb ? { focus: { x: tb.x - 420, y: Math.max(0, tb.y - 30), w: tb.width + 520, h: 560 } } : null;
    await marks.beat('B3-start', 'Properties mode; pointer to the mode toggle', menuBox);
    const item = ui(page).locator('.modes-pop a.mi.content-mode').first();
    for (let i = 0; i < 3 && !(await item.isVisible().catch(() => false)); i++) { await cursor.click(toggle); await sleep(700); }
    if (!(await item.isVisible().catch(() => false))) throw new Error('B3: the mode menu did not open');
    await cursor.click(item);
    await until(xhtml().waitFor({ state: 'visible', timeout: 20_000 }), 'Content mode (the XHTML button)');
    await sleep(500);
    await marks.beat('B3-content', 'Content mode, an empty page', await focus(xhtml()));
    const p1 = await addProse(page, cursor, type, SENTENCE, { onOpen: async (editable) => { await sleep(400); await marks.beat('B3-editor', 'the editor, open and empty', await focus(editable)); } });
    await sleep(800);
    const prose = () => ui(page).locator('.ldh-block-row').first();
    await marks.step('B3-end', p1, 'the sentence, on the page', await focus(prose()));
    await sleep(600);

    // ── B4 · a word linked to a resource ───────────────────────────────────────
    await prose().hover(); await sleep(600);
    const pencil = prose().locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last();
    await marks.beat('B4-start', 'pointer to the block\'s edit pencil', await focus(prose()));
    await cursor.click(pencil);
    await sleep(3000);
    // The mode switch navigated since the copy; make sure what was copied is still what
    // the paste will find (the clipboard is the page's, and a navigation can reset it).
    await page.evaluate((v) => navigator.clipboard.writeText(v), copied.value);
    const an = await annotate(page, cursor, type, { word: 'chart', property: 'subject' });
    if (!an.ok) throw new Error(`B4: ${an.why}`);
    // The save re-renders the block; the beat waits for the row to be back with the word
    // linked, and brings it into the frame, or it is marked over a spinner.
    const linked = prose().locator('[property], [rel], a').filter({ hasText: 'chart' }).first();
    await until(linked.waitFor({ state: 'visible', timeout: 30_000 }), 'the block re-rendered with the linked word');
    await prose().evaluate((el) => el.scrollIntoView({ block: 'center' })); await sleep(1200);
    await marks.beat('B4-end', `"chart" linked with ${an.property} to ${an.uri.replace(base, '')}`, await focus(prose()));
    await sleep(600);

    // ── B5 · the chart embedded, and dragged above the sentence ────────────────
    await marks.beat('B5-start', 'pointer on + Object', await focus(ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first()));
    const o1 = await addObject(page, cursor, type, null, { label: TITLE, kind: 'Result set chart' });
    await until(ui(page).locator('.ldh-block-row svg').first().waitFor({ state: 'visible', timeout: 15_000 }), 'the embedded chart');
    await sleep(1200);
    await marks.step('B5-embedded', o1, 'the chart, inside the page', await focus(ui(page).locator('.ldh-block-row').filter({ has: page.locator('svg') }).first()));
    const rows = ui(page).locator('.ldh-block-row').filter({ has: page.locator('span.ldh-bh-drag') });
    const proseRow = rows.first(), chart = rows.last();
    await easeScrollTop(page, { ms: 1400 }); await sleep(500);
    const fitted = await zoomToFitRows(page, [proseRow, chart]);
    await marks.step('B5-fitted', fitted, (f) => `sentence above, chart below, at ${f.zoom.toFixed(2)}×`, await focus(proseRow, chart));
    const dr = await dragBlock(page, cursor, proseRow, chart);
    await sleep(1500);
    await marks.step('B5-dropped', dr, 'dropped: the sentence now follows the chart', await focus(rows.first(), rows.last()));
    await sleep(600);
    await marks.step('B5-end', dr, 'chart above, sentence below', await focus(rows.first(), rows.last()));
    await sleep(800);

    // ── B5b · a video, embedded: its metadata read as RDF on the fly ───────────
    const VIDEO = 'https://www.youtube.com/watch?v=OM6XIICm_qo'; // Tim Berners-Lee: The next Web of open, linked data (TED)
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await sleep(400);
    const objBtn = ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first();
    await objBtn.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(objBtn)), { duration: 600 });
    await marks.beat('B5b-start', 'pointer on + Object', await focus(objBtn));
    await cursor.click(objBtn);
    const vform = page.locator('form:visible').filter({ hasText: /Value/ }).last();
    await until(vform.waitFor({ state: 'visible', timeout: 15_000 }), 'the object block form');
    await sleep(1200);
    const vinput = vform.locator('.ldh-prop-group').filter({ hasText: 'Value' }).first().locator('input:not([type=hidden]):visible').first();
    await cursor.click(vinput);
    await page.keyboard.type(VIDEO, { delay: 18 });
    await sleep(1200);
    await marks.beat('B5b-typed', 'a video\'s link as the value', await focus(vform));
    await page.keyboard.press('Escape').catch(() => {});
    const vsave = vform.locator('button').filter({ hasText: /Save/ }).last();
    await cursor.moveTo(...(await centre(vsave)), { duration: 500 });
    await cursor.click(vsave);
    await until(ui(page).locator('iframe').first().waitFor({ state: 'visible', timeout: 30_000 }), 'the video card');
    await sleep(3000);
    const vrow = ui(page).locator('.ldh-block-row').filter({ has: page.locator('iframe') }).first();
    await vrow.scrollIntoViewIfNeeded();
    await marks.beat('B5b-end', 'the video, a VideoObject with its title, on the page', await focus(vrow));
    await sleep(800);
    await marks.beat('end');
  },
});

// The scratch document goes once the take is in the can: flow A's tree shot lists the
// root's children, and a leftover "Coverage" there is the rig showing.
console.log('  scratch removed:', JSON.stringify(await removeAll({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, urls: [doc.url] })));
