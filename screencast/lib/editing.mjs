// Editing what already exists — the other half of the loop.
//
// In Properties (read) mode every resource block carries its own edit control; pressing
// it swaps the block for an inline form whose rows are the resource's properties. A
// literal is a text input; a resource value is a committed chip carrying `edit`
// (turns the chip back into a lookup-by-name combobox) and `remove`. Everything here
// finds rows by property label, never by position (form-fields-by-name rule).
import { ui } from './dom.mjs';
import { sleep } from './harness.mjs';
import { pickByLabel } from './blocks.mjs';

const formOf = (page) => ui(page).locator('form.ldh-edit-form, form').filter({ has: page.locator('button.btn-save') }).last();
const rows = (form, label) => form.locator('.ldh-prop-group').filter({ has: form.page().locator('.pred', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) });

// Opens the inline edit form of the resource block whose text matches `hasText`.
export async function editResource(page, cursor, hasText, { settle = 3000 } = {}) {
  const block = ui(page).locator('.ldh-block').filter({ hasText }).first();
  if (!(await block.count())) return { ok: false, why: `no block matching ${hasText}` };
  const btn = block.locator('button').filter({ hasText: /^\s*edit\s*$/ }).first();
  if (!(await btn.count())) return { ok: false, why: 'the block has no edit control' };
  await btn.scrollIntoViewIfNeeded();
  await cursor.click(btn);
  const form = formOf(page);
  const shown = await form.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
  if (!shown) return { ok: false, why: 'the edit form did not open' };
  await sleep(settle);
  return { ok: true, form };
}

// Replaces the text of a literal row (the first row of that label, or the one whose
// current value matches `where`).
export async function setLiteral(page, cursor, type, form, label, value, { where = null } = {}) {
  let row = rows(form, label);
  if (where) row = row.filter({ has: page.locator(`input[value*="${where}"], textarea`) });
  const input = row.first().locator('input:not([type=hidden]):visible, textarea:visible').first();
  if (!(await input.count())) return { ok: false, why: `${label} has no editable value` };
  await input.scrollIntoViewIfNeeded();
  await cursor.click(input);
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+A`);
  await page.keyboard.press('Backspace');
  await type(input, value, { base: 30, spread: 12 });
  return { ok: true };
}

// Edits the tail of a URI-valued row in place: the value stays a URI, its local name
// changes — OrderProblem → OrderDelivered. What a person does with an enumeration
// that has no picker.
export async function retypeLocalName(page, cursor, type, form, label, from, to) {
  const input = rows(form, label).first().locator('input:not([type=hidden]):visible').first();
  if (!(await input.count())) return { ok: false, why: `${label} has no editable value` };
  const current = await input.inputValue();
  if (!current.endsWith(from)) return { ok: false, why: `${label} is ${current}, not …${from}` };
  await input.scrollIntoViewIfNeeded();
  await cursor.click(input);
  await page.keyboard.press('End');
  for (let i = 0; i < from.length; i++) await page.keyboard.press('Backspace');
  await type(input, to, { base: 40, spread: 14 });
  return { ok: true, value: await input.inputValue() };
}

// Removes the value of `label` whose chip text matches `text`.
export async function removeValue(page, cursor, form, label, text) {
  const row = rows(form, label).filter({ hasText: text }).first();
  if (!(await row.count())) return { ok: false, why: `no ${label} value matching ${text}` };
  const btn = row.locator('button').filter({ hasText: /^\s*remove\s*$/ }).first();
  if (!(await btn.count())) return { ok: false, why: `${label} ${text} has no remove control` };
  await btn.scrollIntoViewIfNeeded();
  await cursor.click(btn);
  await sleep(600);
  return { ok: true };
}

// Re-points a resource-valued row: `edit` on the chip opens a lookup, the new value is
// picked by name and type.
export async function repoint(page, cursor, type, form, label, newLabel, { kind = null, where = null } = {}) {
  let row = rows(form, label);
  if (where) row = row.filter({ hasText: where });
  row = row.first();
  if (!(await row.count())) return { ok: false, why: `no ${label} row` };
  const edit = row.locator('button').filter({ hasText: /^\s*edit\s*$/ }).first();
  if (await edit.count()) { await edit.scrollIntoViewIfNeeded(); await cursor.click(edit); await sleep(700); }
  const input = row.locator('input.resource-combobox:visible, input:not([type=hidden]):visible').first();
  if (!(await input.count())) return { ok: false, why: `${label} did not open for editing` };
  const picked = await pickByLabel(page, cursor, type, input, newLabel, { kind });
  return picked.ok ? { ok: true } : { ok: false, why: picked.why };
}

// Adds one more value row for a property: the form's foot carries a select of the
// resource's properties (by local name) and an Add button; the new row is the last of
// that label, empty, and — for a resource property — a lookup-by-name combobox.
export async function addValue(page, cursor, form, localName) {
  const select = form.locator('.ldh-prop-addrow select').first();
  if (!(await select.count())) return { ok: false, why: 'the form has no add-property row' };
  await select.scrollIntoViewIfNeeded();
  const value = await select.evaluate((s, ln) => [...s.options].find((o) => o.value.endsWith('/' + ln) || o.value.endsWith('#' + ln))?.value ?? null, localName);
  if (!value) return { ok: false, why: `${localName} is not a property of this form` };
  await select.selectOption(value);
  await sleep(300);
  const add = form.locator('.ldh-prop-addrow button.add-value').first();
  await cursor.click(add);
  await sleep(900);
  return { ok: true };
}

// Fills the row addValue() just added: the last row of that property.
export async function pickAddedValue(page, cursor, type, form, localName, label, { kind = null } = {}) {
  const row = form.locator('.ldh-prop-group').filter({ has: page.locator(`input[name="pu"][value$="${localName}"]`) }).last();
  const input = row.locator('input:not([type=hidden]):visible, textarea:visible').first();
  if (!(await input.count())) return { ok: false, why: `no empty ${localName} row to fill` };
  if (((await input.getAttribute('class')) ?? '').includes('resource-combobox')) {
    const picked = await pickByLabel(page, cursor, type, input, label, { kind });
    return picked.ok ? { ok: true } : { ok: false, why: picked.why };
  }
  await cursor.click(input);
  await type(input, String(label), { base: 30, spread: 12 });
  return { ok: true };
}

export async function saveForm(page, cursor, form, { settle = 3500 } = {}) {
  const save = form.locator('button.btn-save').first();
  if (!(await save.count())) return { ok: false, why: 'no Save on the form' };
  await save.scrollIntoViewIfNeeded();
  await cursor.click(save);
  await sleep(settle);
  const banner = ui(page).locator('.ac-alert, .alert-error, [role="alert"]').filter({ hasText: /./ }).first();
  const err = (await banner.isVisible().catch(() => false)) ? (await banner.textContent()).replace(/\s+/g, ' ').trim().slice(0, 120) : null;
  return err ? { ok: false, why: err } : { ok: true };
}

// Moving a block: a pointer drag, the way a person does it.
//
// The app's handlers read their subject off the element under the POINTER - ondragstart
// resolves the row from the handle, ondragover marks the row the block would land after,
// ondrop resolves both from wherever the release lands - so the drag is the mouse and not a
// set of DragEvents dispatched at chosen elements. Chromium delivers the HTML5 events for a
// real pointer drag; what it needs is a small first move after the press to cross the drag
// threshold. (The earlier synthetic version was a workaround for a build where pointer drags
// did not reach the handler; measured 2026-09-28, they do, and the browser then also draws
// the drag image under the pointer, which no dispatched event ever could.)
//
// The drop marker is a dotted line at the BOTTOM edge of the target row, and the target here
// is the chart block, taller than the fold. Before the release the page is scrolled so that
// edge is on screen: the marker is what the drag tells the reader, and a marker below the
// fold reads as no marker at all.
//
// The app moves the dragged block AFTER the block it is dropped on, so dropping on the
// previous sibling is a no-op: to put B above A, drag A onto B.
export async function dragBlock(page, cursor, from, to, { travel = 900, hold = 900 } = {}) {
  const handle = from.locator('span.ldh-bh-drag').first();
  if (!(await handle.count())) return { ok: false, why: 'no drag handle on the source block' };
  const target = to.locator('.ldh-block').first();
  if (!(await target.count())) return { ok: false, why: 'no block inside the target row' };
  const order = () => page.evaluate(() => JSON.stringify([...document.querySelectorAll('.ldh-pane.is-active .content-body > .ldh-block-row')].filter((r) => r.querySelector('span.ldh-bh-drag')).map((r) => r.getAttribute('about'))));
  const before = await order();

  await from.hover(); await sleep(300);
  const hb = await handle.boundingBox();
  if (!hb) return { ok: false, why: 'no handle box' };
  const h = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 };
  await cursor.moveTo(h.x, h.y, { duration: 500 });
  await sleep(250);
  await page.mouse.down();
  await page.mouse.move(h.x + 8, h.y + 8);      // cross the drag threshold: the drag starts here
  await sleep(120);

  // travel: the pointer crosses the page in steps, so the rows under it receive the dragover
  // stream a real drag produces, and the target lights up as the app marks it
  const tb = await target.boundingBox();
  if (!tb) return { ok: false, why: 'no target box' };
  await page.mouse.move(tb.x + Math.min(120, tb.width / 2), tb.y + Math.min(60, tb.height / 2), { steps: Math.max(12, Math.round(travel / 40)) });
  await sleep(300);

  // the marker is drawn at the target's bottom edge: bring it into the frame before releasing,
  // unless it is already there (a scene that zoomed the page to fit both rows needs no scroll)
  const viewport = page.viewportSize();
  const edgeVisible = tb.y + tb.height <= viewport.height - 24;
  if (!edgeVisible) {
    await to.evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'smooth' }));
    await sleep(900);
  }
  const tb2 = await target.boundingBox();
  if (tb2) await page.mouse.move(tb2.x + Math.min(120, tb2.width / 2), tb2.y + Math.max(20, tb2.height - 80), { steps: 8 });
  await sleep(hold);
  await page.mouse.up();

  const changed = await page.waitForFunction((b) => JSON.stringify([...document.querySelectorAll('.ldh-pane.is-active .content-body > .ldh-block-row')].filter((r) => r.querySelector('span.ldh-bh-drag')).map((r) => r.getAttribute('about'))) !== b, before, { timeout: 10_000 }).then(() => true, () => false);
  return changed ? { ok: true } : { ok: false, why: 'the order did not change' };
}
