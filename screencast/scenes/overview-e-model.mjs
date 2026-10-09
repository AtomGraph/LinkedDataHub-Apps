// Flow E of the overview — the model builds the interface: Create pressed in the header
// of a property view, the form the class's constructor wrote (E1); Save with the name
// empty, the constraint's violation on that field (E2); the name filled, Save, and the
// view the form came from listing the new record (E3); the page following a switch of
// the reader's colour scheme (E4 — the phone-width half is overview-e-phone.mjs, a take
// of its own, since the recording keeps its frame when the viewport narrows).
//
// Product, not Person: schema:Product carries spin:constraint :MissingName, so an empty
// name is refused by the model's own rule and the violation lands on the Name field. (A
// Person form submitted empty is refused on the document's title instead, and the dialog
// then shows the document form — a platform rule, not the model's.) The view is
// "Products in this category" on Beverages; the product is removed off camera before the
// take so the count reads the same every time.
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { editResource, setLiteral, saveForm } from '../lib/editing.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const PRODUCT = 'Rooibos Chai';
const CATEGORY = `${base}/categories/1/`; // Beverages
const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: PRODUCT });
if (gone.failed?.length) throw new Error(`reset: could not remove ${gone.failed.length} × ${PRODUCT}`);
const READ = `${CATEGORY}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;

await runScene({
  id: 'overview-e-model', target: READ, warm: READ, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, READ, '.ldh-pane.is-active .ldh-block', 3000);

    const view = () => ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Products in this category' }).first();
    const count = async () => (await view().locator('.count b').first().textContent({ timeout: 4000 })).trim();
    // The view's Create renders the constructor's form either in a dialog (a Person on a
    // territory) or inline on the page (a Product on a category); either way it is the
    // visible form that names the class.
    const modal = () => page.locator('.ac-modal:visible form, form:visible').filter({ hasText: /Product/ }).last();
    const groups = () => modal().locator('.ldh-prop-group');
    const fieldOf = async (re) => {
      const c = await groups().count();
      for (let i = 0; i < c; i++) {
        const g = groups().nth(i); const label = ((await g.textContent()) ?? '').replace(/\s+/g, ' ').trim();
        if (!new RegExp(re, 'i').test(label)) continue;
        const input = g.locator('input:not([type=hidden]):visible, textarea:visible').first();
        if (await input.count()) return { group: g, input };
      }
      return null;
    };
    const typeInto = async (re, value) => {
      const f = await fieldOf(re);
      if (!f) throw new Error(`no ${re} field on the form`);
      await f.input.scrollIntoViewIfNeeded();
      await cursor.click(f.input); await f.input.pressSequentially(value, { delay: 35 });
      return f;
    };
    const saveBtn = () => modal().locator('button').filter({ hasText: /Save|Create|check/ }).last();

    // ── E1 · Create from the view's header; the generated form ─────────────────
    const cbtn = view().locator('button.add-instance').first();
    await cbtn.waitFor({ state: 'visible', timeout: 15_000 });
    // The view sits below the fold; its header has to come clear of the sticky header
    // and the floating Create dock, or the pointer's click lands on one of those.
    await easeScrollTo(view(), { ms: 1400, margin: 260 }); await sleep(600);
    const before = await count();
    await cursor.moveTo(...(await centre(cbtn)), { duration: 700 });
    await marks.beat('E1-start', `${before} products in Beverages; pointer on the view's Create`, await focus(view()));
    await cursor.click(cbtn);
    if (!(await modal().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false))) {
      console.log('  E1: the pointer click opened no form; clicking the control itself');
      await cbtn.click();
      await modal().waitFor({ state: 'visible', timeout: 15_000 });
    }
    await until(groups().nth(2).waitFor({ state: 'visible', timeout: 10_000 }), 'the Product form\'s fields');
    await sleep(1500);
    const labels = (await groups().allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 24));
    await marks.beat('E1-end', `the Product form the constructor wrote: ${JSON.stringify(labels)}`, await focus(modal()));
    await sleep(600);

    // ── E2 · the name left empty; Save; the violation on the field ─────────────
    await marks.beat('E2-start', 'filling in everything but the name');
    if (await fieldOf('^Title')) await typeInto('^Title', PRODUCT);
    await typeInto('^Identifier', String(Date.now()).slice(-4));
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 600 });
    await marks.beat('E2-save', 'Name still empty; pointer on Save', await focus(modal()));
    await cursor.click(saveBtn());
    const violated = () => modal().locator('.ldh-prop-group.is-violation');
    await until(violated().first().waitFor({ state: 'visible', timeout: 20_000 }), 'a violation on a field');
    await sleep(1500);
    const which = (await violated().allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 30));
    if (!which.some((w) => /name/i.test(w))) throw new Error(`E2: the violation landed on ${JSON.stringify(which)}, not on Name`);
    await violated().first().scrollIntoViewIfNeeded();
    await marks.beat('E2-end', `refused by the model: ${JSON.stringify(which)}`, await focus(modal()));
    await sleep(1000);

    // ── E3 · the name filled; Save; the view lists the record ──────────────────
    await marks.beat('E3-start', 'pointer to the Name field');
    await typeInto('^Name', PRODUCT);
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 500 });
    await marks.beat('E3-filled', 'the name in; pointer on Save', await focus(modal()));
    await cursor.click(saveBtn());
    await until(modal().waitFor({ state: 'hidden', timeout: 20_000 }), 'the form closing on Save');
    await page.waitForLoadState('load').catch(() => {});
    await sleep(2500);
    console.log('  after save: url', page.url().replace(base, ''));
    // Create-from-view can land on the new document rather than on the view it came from
    // (FINDINGS #14). If it did, the way back is the record's own Category link — on
    // camera, since that is what a person would click — and the view is read there.
    if (!page.url().startsWith(CATEGORY)) {
      await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'the new record');
      await sleep(1500);
      await marks.beat('E3-record', `saved: the record's own document ${page.url().replace(base, '')}`);
      const back = ui(page).locator('a[href*="/categories/1/"]').first();
      if (!(await back.count())) throw new Error('E3: no link back to Beverages on the record');
      await back.scrollIntoViewIfNeeded();
      await cursor.moveTo(...(await centre(back)), { duration: 600 });
      await cursor.click(back);
      await until(page.waitForFunction((t) => location.href.startsWith(t), CATEGORY, { timeout: 20_000 }), 'Beverages again');
      await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'Beverages, rendered again');
    }
    await until(page.waitForFunction(([t, b]) => { const v = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].find((e) => e.textContent.includes('Products in this category')); const c = v && v.querySelector('.count b'); return c && c.textContent.trim() !== b; }, ['x', before], { timeout: 20_000 }), 'the products view listing the new record');
    await sleep(1500);
    await view().scrollIntoViewIfNeeded();
    await marks.beat('E3-end', `${await count()} products in Beverages (was ${before}): the view lists the new record`, await focus(view()));
    await sleep(1200);

    // ── E3b · the record opened and edited: the pencil, a value, Save ──────────
    const link = view().locator('a').filter({ hasText: PRODUCT }).first();
    if (!(await link.count())) throw new Error('E3b: the new product is not linked from the view');
    // Mid-viewport, clear of the sticky header and the Create dock, or the pointer's click
    // lands on one of those instead of the link.
    await easeScrollTo(link, { ms: 1000, block: 'center' }); await sleep(600);
    await cursor.moveTo(...(await centre(link)), { duration: 600 });
    await marks.beat('E3b-start', 'pointer on the new record', await focus(view()));
    const catUrl = page.url().split('?')[0];
    await cursor.click(link);
    const moved = await page.waitForFunction((b) => location.href.split('?')[0] !== b, catUrl, { timeout: 10_000 }).then(() => true, () => false);
    if (!moved) { console.log('  E3b: the pointer click did not navigate; clicking the link itself'); await link.click(); }
    await until(page.waitForFunction((b) => location.href.split('?')[0] !== b, catUrl, { timeout: 20_000 }), 'the record\'s document');
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'the record, rendered');
    await sleep(2000);
    const ed = await editResource(page, cursor, PRODUCT);
    if (!ed.ok) throw new Error(`E3b: ${ed.why}`);
    await marks.beat('E3b-form', 'its form, opened with the pencil', await focus(ed.form));
    const DESCRIPTION = 'A caffeine-free red tea from South Africa, served hot or iced.';
    const lit = await setLiteral(page, cursor, type, ed.form, 'Description', DESCRIPTION);
    if (!lit.ok) throw new Error(`E3b: ${lit.why}`);
    await sleep(600);
    await marks.beat('E3b-filled', 'a description typed', await focus(ed.form));
    const sv = await saveForm(page, cursor, ed.form, { settle: 1500 });
    if (!sv.ok) throw new Error(`E3b: ${sv.why}`);
    await until(page.waitForFunction((t) => (document.querySelector('.ldh-pane.is-active')?.innerText ?? '').includes(t), DESCRIPTION, { timeout: 30_000 }), 'the description on the page');
    await sleep(2000);
    await marks.beat('E3b-end', 'saved: the page re-read with the description', await focus(ui(page).locator('.ldh-block').first()));
    await sleep(800);

    // ── E3c · the form behind the form: the class's constructor ────────────────
    // The record's form again, and its Edit constructors: a dialog listing the properties a new
    // Product starts with, each a literal of a datatype or a resource of a class. Looked at and
    // cancelled, so the model is as it was.
    const ed2 = await editResource(page, cursor, PRODUCT);
    if (!ed2.ok) throw new Error(`E3c: ${ed2.why}`);
    const ctorBtn = page.locator('button.btn-edit-constructors:visible').first();
    await until(ctorBtn.waitFor({ state: 'visible', timeout: 20_000 }), 'Edit constructors, once write access to the constructor is known');
    await ctorBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await sleep(500);
    await cursor.moveTo(...(await centre(ctorBtn)), { duration: 600 });
    await marks.beat('E3c-start', 'pointer on Edit constructors', await focus(ed2.form));
    await cursor.click(ctorBtn);
    const ctorDialog = page.locator('[role=dialog]:visible, .modal:visible, dialog[open]').filter({ hasText: /constructor/i }).last();
    await until(ctorDialog.waitFor({ state: 'visible', timeout: 20_000 }), 'the constructor dialog');
    await sleep(2500);
    const ctorRows = await ctorDialog.locator('button, a').filter({ hasText: /\S/ }).allTextContents();
    await marks.beat('E3c-dialog', `the Product constructor: ${ctorRows.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12).join(', ')}`, await focus(ctorDialog));
    await sleep(4000);
    const ctorCancel = ctorDialog.locator('button').filter({ hasText: /^\s*Cancel\s*$/ }).first();
    await cursor.moveTo(...(await centre(ctorCancel)), { duration: 600 });
    await cursor.click(ctorCancel);
    await ctorDialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await page.keyboard.press('Escape');
    await sleep(800);
    await marks.beat('E3c-end', 'cancelled: the model unchanged');
    await sleep(600);

    // ── E4 · the reader's colour scheme ────────────────────────────────────────
    await marks.beat('E4-start', 'dark, as the reader\'s system is set');
    await page.emulateMedia({ colorScheme: 'light' });
    await sleep(2500);
    await marks.beat('E4-light', 'the reader switches to light; the page follows, no reload');
    await sleep(2000);
    await page.emulateMedia({ colorScheme: 'dark' });
    await sleep(2500);
    await marks.beat('E4-end', 'and back');
    await sleep(800);
    await marks.beat('end');
  },
});

// The product created on camera goes once the take is in the can.
console.log('  scratch removed:', JSON.stringify(await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: PRODUCT })));
