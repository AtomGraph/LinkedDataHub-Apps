// Supercut takes on Northwind at 2×: create-from-view (4), cross-dataspace (8), the
// ontology's form (9), RDFa annotation (12), parallax pivot (15). Each beat carries
// its focus box. Test run: nothing is reset.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { createFromView } from '../lib/constructors.mjs';
import { copyUri, contentModeUrl } from '../lib/blocks.mjs';
import { annotate } from '../lib/annotate.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ONLY = (process.argv.find((a) => a.startsWith('--shots=')) ?? '').slice(8).split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const doc = async (title) => (await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "${title}" } } LIMIT 1`))[0]?.doc;
const ALIGN = await doc('Category alignment');
if (!ALIGN) throw new Error('no Category alignment page');
const count = async (within) => (await within.locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();

await runScene({
  id: 'supercut-northwind', target: `${base}/regions/4/`, warm: `${base}/regions/4/`, identity,
  // SUPERCUT_1X=1: a 1440×900 take without the document zoom — the RDFa word selection
  // (caret geometry) does not survive CSS zoom.
  geometry: geometryFrom(opts, process.env.SUPERCUT_1X ? { width: 1440, height: 900, deviceScaleFactor: 1 } : GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    if (!process.env.SUPERCUT_1X) await zoom2x(page);

    if (want('4')) {
    // ── 4 · Save on the Territory form → the map, one more pin ────────────────
    await load(page, `${base}/regions/4/`, '.ldh-pane.is-active button.add-instance', 3000);
    const view = ui(page).locator('.ldh-block[data-for-class]').filter({ hasText: 'Cities in this region' }).first();
    const btn = view.locator('button.add-instance').first();
    await btn.scrollIntoViewIfNeeded(); await cursor.click(btn);
    const modal = ui(page).locator('.modal-constructor:visible, .ac-modal:visible').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 }); await sleep(1200);
    const n = String(Date.now()).slice(-3);
    for (const [re, val] of [['^Title', 'El Paso'], ['^Name', 'El Paso'], ['^Identifier', `79${n}`], ['Latitude|^Lat\\b', '31.7619'], ['Longitude|^Long\\b', '-106.4850']]) {
      const groups = modal.locator('.ldh-prop-group'); const c = await groups.count();
      for (let i = 0; i < c; i++) { const g = groups.nth(i); const label = ((await g.textContent()) ?? '').replace(/\s+/g, ' ').trim(); if (!new RegExp(re, 'i').test(label)) continue; const input = g.locator('input:not([type=hidden]):visible').first(); if (!(await input.count()) || await input.inputValue()) continue; await cursor.click(input); await input.pressSequentially(val, { delay: 35 }); break; }
    }
    const save = modal.locator('button').filter({ hasText: /Save|Create|check/ }).last();
    await save.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(save)), { duration: 400 });
    const before4 = await count(ui(page));
    await marks.beat('4-start', `the Territory form, filled — pointer on Save (${before4} cities)`, await focus(modal));
    await cursor.click(save);
    await page.waitForFunction(() => ![...document.querySelectorAll('.modal-constructor, .ac-modal')].some((m) => m.offsetParent !== null), null, { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('load').catch(() => {});
    await sleep(800);
    await marks.beat('4-saved', 'saved');
    // The view on this page is already a map (its default mode): the new city is a pin
    // right here, no navigation. The view may not re-read itself after the modal
    // closes (FINDINGS #14); if its count has not moved in a moment, the breadcrumb
    // reloads the page — a visible click, not a goto.
    const moved = await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, before4, { timeout: 8000 }).then(() => true, () => false);
    if (!moved) {
      const crumb = ui(page).locator('.ldh-bc a').filter({ hasText: 'Southern' }).first();
      if (await crumb.count()) { await cursor.click(crumb); await page.waitForLoadState('load').catch(() => {}); await page.waitForSelector('.ldh-pane.is-active .ol-viewport canvas', { timeout: 30_000 }).catch(() => {}); await sleep(2000); }
      else console.log('  no Southern breadcrumb; the map may show the old count');
    }
    const mapBlock = ui(page).locator('.ldh-block').filter({ has: page.locator('.ol-viewport') }).first();
    await mapBlock.locator('.ol-viewport canvas').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    await easeScrollTo(mapBlock, { ms: 1400, margin: 24 }).catch(() => {});
    await sleep(1200);
    await marks.beat('4-end', `${await count(ui(page))} cities on the region's map (was ${before4}, refreshed itself: ${moved})`, await focus(mapBlock));
    await sleep(2500);
    }

    if (want('9')) {
    // ── 9 · Create ▸ Person → the typed form ──────────────────────────────────
    await load(page, `${base}/employees/2/`, '.ldh-pane.is-active button.add-instance', 3000);
    const view = ui(page).locator('.ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const cbtn = view.locator('button.add-instance').first();
    await cbtn.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(cbtn)), { duration: 400 });
    await marks.beat('9-start', 'Direct reports — pointer on Create', await focus(view));
    await cbtn.click();
    const pm = page.locator('.modal-constructor:visible, .ac-modal:visible').last();
    await pm.waitFor({ state: 'visible', timeout: 15_000 });
    await pm.locator('.ldh-prop-group').nth(6).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await sleep(1400);
    await marks.beat('9-end', 'the Person form the ontology wrote', await focus(pm));
    await sleep(900);
    await page.keyboard.press('Escape'); await sleep(400);
    const close = pm.locator('button').filter({ hasText: /Close/ }).first(); if (await close.count()) await close.click().catch(() => {});
    }

    if (want('15')) {
    // ── 15 · a pivot pill → results re-centre ─────────────────────────────────
    await load(page, `${base}/employees/`, '.ldh-pane.is-active .ldh-view-toolbar', 3000);
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    const bar = ui(page).locator('details.ldh-pivot-bar').first();
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await cursor.click(bar.locator('summary').first()); await sleep(700); }
    const pill = ui(page).locator('.ldh-pivot-pill:visible').filter({ hasText: 'Territory' }).first();
    if (!(await pill.count())) throw new Error('no Territory pivot pill');
    await pill.scrollIntoViewIfNeeded();
    const before15 = await count(ui(page));
    await cursor.moveTo(...(await centre(pill)), { duration: 400 });
    await marks.beat('15-start', 'nine employees; pointer on the Territory pill', await focus(view));
    await pill.click();
    await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, before15, { timeout: 20_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('15-end', `${await count(ui(page))} territories`, await focus(view));
    await sleep(800);
    }

    if (want('12')) {
    // ── 12 · a word in prose → a property → the concept → a link ──────────────
    await load(page, contentModeUrl(ALIGN), '.ldh-pane.is-active .ldh-block-row', 3500);
    const conceptBlock = ui(page).locator('.ldh-block-row').filter({ hasText: /Alternative label|Narrower/ }).first();
    const copied = await copyUri(page, cursor, conceptBlock, { match: 'concept' });
    if (!copied.ok) throw new Error(copied.why);
    const prose = ui(page).locator('.ldh-block-row').filter({ hasText: 'published vocabulary' }).first();
    await prose.scrollIntoViewIfNeeded(); await prose.hover(); await sleep(500);
    await cursor.click(prose.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last());
    await sleep(3000);
    await marks.beat('12-start', 'the sentence, open for editing', await focus(prose));
    const a = await annotate(page, cursor, type, { word: 'Beverages', property: 'exact' });
    await sleep(1200);
    await marks.beat('12-end', a.ok ? 'skos:exactMatch — the word is a link into the thesaurus' : a.why, await focus(prose));
    await sleep(800);
    }

    if (want('8')) {
    // ── 8 · apps menu → another dataspace, same chrome ────────────────────────
    await load(page, `${base}/categories/`, '.ldh-pane.is-active .ldh-block', 3000);
    const apps = page.locator('button.btn-apps').first();
    await cursor.click(apps); await sleep(500);
    const unesco = page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first();
    await cursor.moveTo(...(await centre(unesco)), { duration: 350 });
    await marks.beat('8-start', 'the applications menu, UNESCO under the pointer');
    await unesco.click();
    await page.waitForFunction(() => { const p = document.querySelector('.ldh-pane.is-active'); return p && /UNESCO/.test(p.textContent) && [...p.querySelectorAll('img')].some((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 30_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('8-end', 'another dataspace, same chrome');
    await sleep(600);
    }
    await marks.beat('end');
  },
});
