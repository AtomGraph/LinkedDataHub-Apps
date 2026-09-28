// Supercut takes on Rebrickable: URL → resource (3), chart pane (6), object embed (7),
// derived views (10), SPARQL editor (11), image on a record (14, if the form offers a
// file), search (19), edit in place (20). 2× footage; each beat carries its focus box.
// Test run: nothing is reset; the write-up page is created on camera and left.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { openTree } from '../lib/nav.mjs';
import { addObject, switchDocumentMode, contentModeUrl, pickByLabel, copyUri } from '../lib/blocks.mjs';
import { create, createItem, typeQuery, fill, save, field } from '../lib/constructors.mjs';
import { editResource } from '../lib/editing.mjs';
import { glideTo } from '../lib/frame.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ONLY = (process.argv.find((a) => a.startsWith('--shots=')) ?? '').slice(8).split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const SET = `${base}/sets/10229-1/`;
const PART = `${base}/parts/3005/`;
const VIDEO = 'https://www.youtube.com/watch?v=LBseYMmxxZY';
const READ = (u) => `${u}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;
const QUERY = `PREFIX ns: <${base}/ns#>

SELECT ?set ?parts
WHERE {
GRAPH ?g {
?set a ns:Set ;
ns:numParts ?parts .
FILTER (?parts > 5000)
}
}
ORDER BY DESC(?parts)`;

await runScene({
  id: 'supercut-rebrickable', target: SET, warm: SET, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    const saveBtn = () => ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last().locator('button.btn-save').first();

    if (want('20')) {
    // ── 20 · pencil → the record is its form ───────────────────────────────────
    await load(page, SET, '.ldh-pane.is-active .ldh-block', 3000);
    const block = ui(page).locator('.ldh-block').filter({ hasText: /Number of parts/ }).first();
    const pencil = block.locator('button').filter({ hasText: /^\s*edit\s*$/ }).first();
    await pencil.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(pencil)), { duration: 400 });
    await marks.beat('20-start', 'the set record; pointer on the pencil', await focus(block));
    await pencil.click();
    const form = ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last();
    await form.waitFor({ state: 'visible', timeout: 15_000 });
    await sleep(1200);
    await marks.beat('20-end', 'the record as its form', await focus(form));
    await sleep(800);

    // ── 14 · an image put on the record, if the form takes a file ─────────────
    const file = form.locator('input[type=file]').first();
    if (await file.count()) {
      await marks.beat('14-start', 'the image row of the form', await focus(file));
      await file.setInputFiles('/private/tmp/claude-501/-Users-martynas-WebRoot-LinkedDataHub/5542c912-918c-4be9-8864-ed41b61b33fa/scratchpad/sc/zoom2x.png');
      await sleep(800);
      await cursor.click(saveBtn());
      await ui(page).locator('.ldh-block img[src*="/uploads/"]').first().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
      await sleep(1200);
      await marks.beat('14-end', 'the image, on the record', await focus(ui(page).locator('.ldh-block').filter({ hasText: /Number of parts/ }).first()));
    } else {
      console.log('  14: the edit form has no file input — skipped');
      const cancel = form.locator('button').filter({ hasText: /Cancel|Close|Reset/ }).first();
      if (await cancel.count()) await cancel.click().catch(() => {}); else await page.keyboard.press('Escape');
    }
    await sleep(600);
    }

    if (want('3')) {
    // ── 3 · a pasted URL → a resource on the page ─────────────────────────────
    await load(page, contentModeUrl(SET), '.ldh-pane.is-active .ldh-block', 3000);
    const add = ui(page).locator('button').filter({ hasText: /Object/ }).last();
    await add.scrollIntoViewIfNeeded(); await cursor.click(add);
    const value = field(page, 'Value', 'input:not([type=hidden]):visible');
    await value.waitFor({ state: 'visible', timeout: 10_000 });
    await cursor.click(value); await type(value, VIDEO, { base: 14, spread: 6 });
    await sleep(800);
    const sv = saveBtn();
    await cursor.moveTo(...(await centre(sv)), { duration: 400 });
    await marks.beat('3-start', 'a YouTube URL in the Value field — pointer on Save', await focus(ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last()));
    await sv.click();
    const card = ui(page).locator('iframe[src*="youtube"], img[src*="ytimg"]').first();
    await card.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('3-end', 'the video, rendered as a resource', await focus(card.locator('xpath=ancestor::div[contains(@class,"ldh-block-row")][1]')));
    await sleep(800);
    }

    let page7 = null;
    if (want('7') || want('11')) {
    // ── 7 · Save on an Object block → a grid of sets inside the page ──────────
    await load(page, `${base}/`, '.ldh-pane.is-active .ldh-block', 3000);
    const made = await createItem(page, cursor, 'Supercut');
    if (!made.ok) throw new Error(made.why);
    page7 = made.url;
    await sleep(600);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    // The lookup-by-title does not answer on this store in time, so the view's URI is
    // copied from the front page's own block and pasted (the copy is off-shot).
    await load(page, contentModeUrl(`${base}/`), '.ldh-pane.is-active .ldh-block-row', 3000);
    const newest = ui(page).locator('.ldh-block-row').filter({ hasText: 'Newest sets' }).first();
    const copied = await copyUri(page, cursor, newest, { match: null });
    if (!copied.ok) throw new Error(copied.why);
    await load(page, contentModeUrl(page7), '.ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 3000);
    const add = ui(page).locator('button').filter({ hasText: /Object/ }).last();
    await cursor.click(add);
    const value = field(page, 'Value', 'input:not([type=hidden]):visible');
    await value.waitFor({ state: 'visible', timeout: 10_000 });
    await cursor.click(value);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    await sleep(1500);
    const suggestion = ui(page).locator('.ac-cb-panel[role="listbox"] li.ac-cb-item').first();
    if (await suggestion.isVisible().catch(() => false)) { await cursor.click(suggestion); await sleep(600); }
    const modeSelect = field(page, 'Layout mode', 'select:visible');
    if (await modeSelect.count()) await modeSelect.selectOption({ label: 'Grid' }).catch(() => {});
    const sv = saveBtn();
    await cursor.moveTo(...(await centre(sv)), { duration: 400 });
    await marks.beat('7-start', 'an Object block bound to a view — pointer on Save', await focus(ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last()));
    await sv.click();
    await page.waitForFunction(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row img')].filter((i) => i.complete && i.naturalWidth > 0).length >= 6, null, { timeout: 40_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('7-end', 'a grid of sets inside the page', await focus(ui(page).locator('.ldh-block-row').filter({ has: page.locator('img') }).first()));
    await sleep(800);
    }

    if (want('11')) {
    // ── 11 · a SPARQL query typed → its results ───────────────────────────────
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(600);
    const cs = await create(page, cursor, 'SELECT');
    if (!cs.ok) throw new Error(cs.why);
    const editor = ui(page).locator('.CodeMirror').first();
    await marks.beat('11-start', 'an empty query editor', await focus(editor));
    const q = await typeQuery(page, cursor, QUERY);
    await sleep(400);
    await fill(page, cursor, 'Title', 'Sets over five thousand parts');
    const s = await save(page, cursor);
    await marks.beat('11-typed', q.ok ? 'typed and saved' : q.why);
    await ui(page).locator('.ldh-block-row').filter({ hasText: 'Sets over five thousand parts' }).first().locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('11-end', s.ok ? 'the result rows' : s.why, await focus(ui(page).locator('.ldh-block-row').filter({ hasText: 'Sets over five thousand parts' }).first()));
    await sleep(800);
    }

    if (want('6')) {
    // ── 6 · line chart → bars, on the front page's own query ──────────────────
    // On the query shot 11 just saved: its row carries the chart pane.
    const row = ui(page).locator('.ldh-block-row').filter({ hasText: 'Sets over five thousand parts' }).first();
    await row.locator('select.chart-type').first().waitFor({ state: 'visible', timeout: 20_000 });
    await row.scrollIntoViewIfNeeded(); await sleep(800);
    const typeSel = row.locator('select.chart-type').first();
    await typeSel.selectOption({ label: 'Line chart' });
    await sleep(2500);
    await cursor.moveTo(...(await centre(typeSel)), { duration: 400 });
    await marks.beat('6-start', 'chart type: Line chart', await focus(row));
    const rects = await row.locator('svg rect').count();
    await typeSel.selectOption({ label: 'Bar chart' });
    await page.waitForFunction(([n]) => { const r = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')].find((x) => x.querySelector('select.chart-type') && x.textContent.includes('Sets over five thousand parts')); return r && r.querySelectorAll('svg rect').length > n + 4; }, [rects], { timeout: 20_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('6-end', `bars (${await row.locator('svg rect').count()} rects)`, await focus(row));
    await sleep(800);
    }

    if (want('10')) {
    // ── 10 · a record page grows lists it never declared ──────────────────────
    await load(page, PART, '.ldh-pane.is-active .ldh-block[data-for-class]', 4000);
    await glideTo(page, 0);
    await sleep(600);
    const record = ui(page).locator('.ldh-block').filter({ hasText: /Number/ }).first();
    await marks.beat('10-start', 'Brick 1 x 1 — the record', await focus(record));
    const last = ui(page).locator('.ldh-block[data-for-class]').last();
    const y = await last.evaluate((e) => e.getBoundingClientRect().top + window.scrollY - 80);
    await glideTo(page, Math.max(0, y), 4500);
    await sleep(1000);
    await marks.beat('10-end', `${await ui(page).locator('.ldh-block[data-for-class]').count()} derived views below the record`);
    await sleep(800);
    }

    if (want('19')) {
    // ── 19 · search over 158 k documents ──────────────────────────────────────
    await load(page, `${base}/`, '.ldh-pane.is-active .ldh-block', 3000);
    await openTree(page, cursor);
    const box = ui(page).locator('.left-sidebar input[name="q"], .sb-search input[name="q"]').first();
    await cursor.click(box); await box.pressSequentially('Millennium Falcon', { delay: 55 }); await sleep(400);
    await marks.beat('19-start', 'a name typed in the drawer', await focus(box));
    await page.keyboard.press('Enter');
    const dialog = page.locator('.ac-modal:visible').last();
    await dialog.waitFor({ state: 'visible', timeout: 40_000 }).catch(() => {});
    await page.waitForFunction(() => { const ms = [...document.querySelectorAll('.ac-modal')].filter((m) => m.offsetParent !== null); return ms.length && /Total results\s+\d/.test(ms.at(-1).textContent); }, null, { timeout: 60_000 }).catch(() => {});
    await sleep(2000);
    await marks.beat('19-end', 'results, with their photographs and types', await focus(dialog));
    await sleep(800);
    await page.keyboard.press('Escape');
    }
    await marks.beat('end');
  },
});
