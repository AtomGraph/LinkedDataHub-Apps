// A page assembled from resources — one gesture take in five beats: a SELECT typed and
// saved, a chart made from it, a sentence typed in Content mode, the chart embedded
// beside it, the chart dragged above the sentence. Dark, 2×, the pointer at a person's
// pace. The page is reset off camera; everything on camera is the app.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { create, typeQuery, fill, save, configureChart } from '../lib/constructors.mjs';
import { addProse, addObject, switchDocumentMode, contentModeUrl } from '../lib/blocks.mjs';
import { dragBlock } from '../lib/editing.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo, easeScrollTop } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
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
const doc = await resetDocument({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, container: base.endsWith('/') ? base : base + '/', slug: 'supercut-compose', title: 'Coverage' });
const READ = `${doc.url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;
console.log('page:', doc.url);

await runScene({
  id: 'supercut-compose', target: READ, warm: READ, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    await load(page, READ, '.ldh-pane.is-active .ldh-view-toolbar, .ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 2500);
    // ── c1 · a SELECT, typed and saved ─────────────────────────────────────────
    const cs = await create(page, cursor, 'SELECT');
    if (!cs.ok) throw new Error(cs.why);
    const editor = ui(page).locator('.CodeMirror').first();
    const form = editor.locator('xpath=ancestor::form[1]');
    // marked at each typing attempt: a retake after a failed read-back supersedes the first
    const q = await typeQuery(page, cursor, QUERY, {
      onAttempt: async (n) => marks.beat('c1-start', `an empty query form (attempt ${n})`, await focus(form)),
      onTyped: async () => marks.beat('c1-typed', 'the last character in', await focus(form)),
    });
    await marks.beat('c1-verified', q.ok ? 'the query, read back' : q.why, await focus(form));
    // The form is taller than the viewport: glide it up so that Save sits at the bottom and
    // the Title field is in view, rather than letting the Title click jump the page. The
    // camera can then ride the page's own scroll from the editor down to Save.
    const saveBtn = form.locator('button.btn-save, button[class*="btn-save"]').filter({ visible: true }).last();
    await easeScrollTo(saveBtn, { ms: 2000, block: 'end', margin: 0 }).catch(() => {});
    await sleep(300);
    await marks.beat('c1-scrolled', 'the form\'s foot in view: Title, Save', await focus(saveBtn));
    await fill(page, cursor, 'Title', TITLE);
    await cursor.moveTo(...(await centre(saveBtn)), { duration: 600 });
    await marks.beat('c1-save', 'pointer on Save', await focus(saveBtn));
    await cursor.click(saveBtn);
    const s1 = { ok: true };
    await marks.beat('c1-saved', 'saved');
    const row = () => ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).first();
    await row().locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    // the form was taller than the viewport; the block it became is above — scroll to it
    await easeScrollTo(row(), { ms: 1400, margin: 40 }); await sleep(600);
    await marks.beat('c1-end', q.ok && s1.ok ? 'four rows' : (q.why ?? s1.why), await focus(row()));
    // ── c2 · a chart from it ───────────────────────────────────────────────────
    await marks.beat('c2-start', 'the rows; chart type: Table', await focus(row()));
    const cfg = await configureChart(page, cursor, row(), { type: 'Bar chart', category: 'region', series: ['reps'] });
    await sleep(1200);
    await marks.beat('c2-drawn', cfg.ok ? 'bars in the pane' : cfg.why, await focus(row()));
    const createChart = row().locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    // the pane's Create sits where the page's floating "+ Create" menu floats: bring it to mid-viewport first
    await createChart.evaluate((el) => el.scrollIntoView({ block: 'center' })); await sleep(500);
    await cursor.click(createChart); await sleep(2000);
    await fill(page, cursor, 'Title', TITLE);
    const s2 = await save(page, cursor);
    await sleep(600);
    await easeScrollTo(ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).last(), { ms: 1400, margin: 40 }).catch(() => {}); await sleep(600);
    await marks.beat('c2-end', cfg.ok && s2.ok ? 'bars, saved as a chart' : (cfg.why ?? s2.why), await focus(ui(page).locator('.ldh-block-row').filter({ hasText: TITLE }).last()));
    // ── c3 · Content: a sentence, typed ────────────────────────────────────────
    // the menu item has been seen highlighted without the mode changing: check for the
    // Content-mode buttons, try once more, and fall back to the mode URL — all off camera
    const xhtml = () => ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'XHTML' }).first();
    // the document-level mode toggle, with room below it for its menu
    const toggle = ui(page).locator('button.layout-modes.drop-toggle, button[title="Mode"]').first();
    await easeScrollTop(page, { ms: 1400 }); await sleep(600);
    const tb = await toggle.boundingBox();
    const menuBox = tb ? { focus: { x: tb.x - 420, y: Math.max(0, tb.y - 30), w: tb.width + 520, h: 560 } } : null;
    await marks.beat('c3t-start', 'Properties mode; pointer to the mode toggle', menuBox);
    // the toggle and its Content item by hand, so the end beat lands as the mode
    // renders — the helper's settle after it would be dead air on camera
    const item = ui(page).locator('.modes-pop a.mi.content-mode').first();
    for (let i = 0; i < 3 && !(await item.isVisible().catch(() => false)); i++) { await cursor.click(toggle); await sleep(700); }
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await xhtml().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
      await sleep(500);
    }
    await marks.beat('c3t-end', (await xhtml().isVisible().catch(() => false)) ? 'Content mode' : 'the menu did not switch the mode', menuBox);
    for (let i = 0; i < 2 && !(await xhtml().isVisible().catch(() => false)); i++) {
      await page.keyboard.press('Escape').catch(() => {});
      await switchDocumentMode(page, cursor, 'content-mode');
      await sleep(1500);
    }
    if (!(await xhtml().isVisible().catch(() => false))) {
      console.log('  mode menu did not switch; loading the Content-mode URL');
      await load(page, contentModeUrl(doc.url), 'button', 2500);
      await xhtml().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    }
    await sleep(800);
    await marks.beat('c3-start', 'Content mode, an empty page', await focus(xhtml()));
    const p1 = await addProse(page, cursor, type, 'Eastern has four reps on nineteen territories. Southern has two on eight.');
    await sleep(800);
    await marks.beat('c3-end', p1.ok ? 'the sentence, on the page' : p1.why, await focus(ui(page).locator('.ldh-block-row').first()));
    // ── c4 · the chart, embedded beside it ─────────────────────────────────────
    await marks.beat('c4-start', 'pointer on + Object', await focus(ui(page).locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first()));
    const o1 = await addObject(page, cursor, type, null, { label: TITLE, kind: 'Result set chart' });
    await ui(page).locator('.ldh-block-row svg').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await sleep(1200);
    await marks.beat('c4-end', o1.ok ? 'the chart, inside the page' : o1.why, await focus(ui(page).locator('.ldh-block-row').filter({ has: page.locator('svg') }).first()));
    // ── c5 · the chart dragged above the sentence ──────────────────────────────
    const rows = ui(page).locator('.ldh-block-row').filter({ has: page.locator('span.ldh-bh-drag') });
    const prose = rows.first(), chart = rows.last();
    await easeScrollTop(page, { ms: 1400 }); await sleep(500);
    await marks.beat('c5-start', 'sentence above, chart below', await focus(prose, chart));
    // the app moves the dragged block after the drop target: the sentence goes below the chart
    const dr = await dragBlock(page, cursor, prose, chart);
    await sleep(1500);
    await marks.beat('c5-dropped', dr.ok ? 'dropped: the sentence now follows the chart' : dr.why, await focus(rows.first()));
    // the chart block is taller than the fold: glide down so the bars and the sentence
    // under them are both on screen, and the swap can be read
    await easeScrollTo(rows.last(), { ms: 1400, block: 'end', margin: 440 }).catch(() => {});
    await sleep(600);
    await marks.beat('c5-end', dr.ok ? 'chart above, sentence below' : dr.why, await focus(rows.last()));
    await sleep(600);
    await marks.beat('end');
  },
});
