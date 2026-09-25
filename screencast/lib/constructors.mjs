// Creating instances of the ontology's classes.
//
// The Create menu is mode-gated: in ContentMode it offers only the two block types,
// because those are the only things allowed as rdf:_N content. Switch the document
// to Properties and the dock offers LDH's own creatable types — Instance, SELECT,
// View, Result set chart, the import types, File, Service (13 entries, measured).
//
// Not "every class the ontology declares": that list is a fixed parameter of the
// platform, and a domain class such as schema:Product never appears in it. An instance
// of one is made by creating an Instance and setting its Type, which is the route the
// user guide describes.
//
// The form renders inline on the document rather than in a modal, because the
// resource being created belongs to this document.

import { ui, settled } from './dom.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Opens Create ▸ <label> and returns the inline form it adds.
export async function create(page, cursor, label) {
  const menu = ui(page).locator('button.drop-toggle').filter({ hasText: 'Create' }).first();
  if (!(await menu.count())) return { ok: false, why: 'no Create button — is the document in Properties?' };

  for (let attempt = 1; attempt <= 3; attempt++) {
    await cursor.click(menu);
    await sleep(1100);
    const item = ui(page).locator('.add-constructor').filter({ hasText: label }).first();
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await settled(page, 3000);
      return { ok: true };
    }
  }
  return { ok: false, why: `${label} not offered by the Create menu` };
}

// The create DOCK, at the foot of the document — a different control from the action
// bar's Create menu, and the one that offers the ontology's classes.
//
// The action bar offers Container and Item; the dock offers Instance, File, the import
// types, the query types, View and the charts. Both toggles read "Create", so a locator
// that takes the first match in the document gets the action bar's and reports that the
// menu does not offer what was asked for — which is what "the Create menu hides every
// constructor but Container and Item" recorded.
//
// Measured on /products/ in Properties mode: the dock offers 13 entries. In Content mode
// it offers the two block types instead, so the document must be in Properties first.
export async function createFromDock(page, cursor, label) {
  const dock = page.locator('.ldh-create-dock');
  if (!(await dock.count())) return { ok: false, why: 'no create dock on this document' };

  const toggle = dock.locator('button.drop-toggle').first();
  if (!(await toggle.count())) return { ok: false, why: 'the dock has no Create menu — is the document in Properties?' };

  for (let attempt = 1; attempt <= 3; attempt++) {
    await cursor.click(toggle);
    await sleep(1100);
    // Ends-with: every entry runs a Material icon ligature straight into its word, so
    // the text reads "categoryInstance" and an anchored /^Instance$/ matches nothing.
    const item = page.locator('.add-constructor:visible')
      .filter({ hasText: new RegExp(`${label}$`) }).first();
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await settled(page, 3000);
      return { ok: true };
    }
  }
  const offered = await page.locator('.add-constructor:visible').allInnerTexts().catch(() => []);
  return { ok: false, why: `${label} not offered by the dock (${offered.length} entries)` };
}

// The query text field is a CodeMirror, which ignores value assignment — only real
// keystrokes reach it.
//
// A query on camera has to read like one a person wrote: prefixes on their own
// lines, WHERE on its own, graph patterns indented. So it is written multi-line and
// UNINDENTED, and the editor's own auto-indent produces the shape — which is also
// why supplying indentation would double it. Closing braces are typed normally;
// CodeMirror types over the ones its auto-closing inserted.
//
// All of that is silent when it goes wrong, so the text is read back and compared.
export async function typeQuery(page, cursor, query) {
  const code = ui(page).locator('.CodeMirror, .yasqe').first();
  if (!(await code.isVisible().catch(() => false))) return { ok: false, why: 'no query editor on the form' };

  await cursor.click(code);
  await sleep(400);

  // The editor completes variable names in a popup that takes Enter as "accept",
  // so a query typed as one string can lose a line break to a completion — "?name"
  // came back as "?addressname" with the closing brace on the same line. Each line
  // goes in on its own, and any open popup is dismissed before the line break.
  const typeLines = async (delay) => {
    const lines = query.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) await page.keyboard.type(lines[i], { delay });
      if (i < lines.length - 1) {
        await sleep(160);
        if (await page.locator('.CodeMirror-hints:visible').count()) { await page.keyboard.press('Escape'); await sleep(120); }
        await page.keyboard.press('Enter');
      }
    }
    await sleep(1200);
  };
  const readBack = () => page.evaluate(() => {
    const cm = document.querySelector('.ldh-pane.is-active .CodeMirror');
    return cm?.CodeMirror ? cm.CodeMirror.getValue() : null;
  }).catch(() => null);
  // Compare ignoring the indentation the editor added for us.
  const flat = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

  await typeLines(14);
  let written = await readBack();
  if (written === null) return { ok: true, lines: query.split('\n').length, verified: false };
  if (flat(written) !== flat(query)) {
    // Once more, slower, over a cleared editor — a corrupted query saved is worse
    // than a retake on camera.
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+A`); await page.keyboard.press('Backspace'); await sleep(300);
    await typeLines(28);
    written = await readBack();
  }
  const matched = flat(written ?? '') === flat(query);
  return {
    ok: matched,
    lines: (written ?? '').split('\n').length,
    verified: true,
    why: matched ? undefined : 'the editor did not receive the query as written',
  };
}

// The control belonging to a named property. Everything that writes to a form goes
// through here — see the form-fields-by-name rule.
export function field(page, label, kind = 'input:not([type=hidden]):visible, textarea:visible, select:visible') {
  return ui(page).locator('.ldh-prop-group').filter({ hasText: label }).first().locator(kind).first();
}

// Fills a field by its property name.
//
// The form has no <label> elements: each field is a `.ldh-prop-group` carrying its
// name as text. Filtering anything coarser — a form, a block row — matches the
// container that holds EVERY label, and then takes its first control, which on the
// View form is the query combobox. That is how a title once got typed into the
// middle of a URI.
export async function fill(page, cursor, label, value) {
  const input = field(page, label, 'input:not([type=hidden]):visible, textarea:visible');
  if (!(await input.isVisible().catch(() => false))) return { ok: false, why: `${label} has no editable control` };

  await cursor.click(input);
  await input.pressSequentially(value, { delay: 55 });
  await sleep(500);
  return { ok: true, into: await input.getAttribute('name').catch(() => null) };
}

// The inline form's own Save, not the document action bar's.
export async function save(page, cursor) {
  const btn = ui(page).locator('button.btn-save, button[class*="btn-save"]').last();
  if (!(await btn.isVisible().catch(() => false))) return { ok: false, why: 'no Save on the form' };
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await cursor.click(btn);
  await settled(page, 3200);
  return { ok: true };
}

// Configuring a saved query's chart pane.
//
// Two traps, and they pull in opposite directions.
//
// The Series list arrives with EVERY result variable selected, the category included —
// so ?rep, ?territories, ?orders opens with the string ?rep as a series beside two
// integers, and the pane answers with a red "All series on a given axis must be of the
// same data type". That is the app's own default state, not something the scene did.
//
// The obvious fix — set the series first, then the type — is worse: changing the chart
// type re-renders the pane and resets the multi-select back to everything, so the error
// becomes permanent and is saved into the chart. Order is therefore type, then category,
// then series LAST, and the selection is read back rather than assumed.
//
// The category select is found by its options rather than its position: the pane is not
// a .ldh-prop-group form, so there is no label to filter on, and "the second select" is
// exactly the kind of positional pick that writes into the wrong control.
export async function configureChart(page, cursor, row, { type, category = null, series }) {
  const singles = row.locator('select:not([multiple])');
  const multi = row.locator('select[multiple]').first();

  const applySeries = async () => {
    if (!(await multi.count())) return;
    await multi.scrollIntoViewIfNeeded();
    await multi.selectOption(series).catch(() => {});
    await sleep(700);
  };
  const selected = async () => multi.evaluate(
    (el) => [...el.selectedOptions].map((o) => o.value),
  ).catch(() => []);

  // 1. type first — it resets what follows
  const typeSelect = singles.first();
  if (await typeSelect.count()) {
    await typeSelect.scrollIntoViewIfNeeded();
    await typeSelect.selectOption({ label: type }).catch(() => {});
    await sleep(900);
  }

  // 2. category, located by the options it offers
  if (category) {
    const n = await singles.count();
    for (let i = 0; i < n; i++) {
      const sel = singles.nth(i);
      const opts = await sel.evaluate((el) => [...el.options].map((o) => o.value)).catch(() => []);
      if (opts.includes(category)) {
        await sel.scrollIntoViewIfNeeded();
        await sel.selectOption(category).catch(() => {});
        await sleep(600);
        break;
      }
    }
  }

  // 3. series last, then read back and retry once — a silent miss here is a chart
  // saved in the error state, which is worse than the transient banner it replaced
  await applySeries();
  let got = await selected();
  if (series.some((v) => !got.includes(v)) || got.length !== series.length) {
    await applySeries();
    got = await selected();
  }

  const complaint = row.locator('.ac-alert, .alert, [class*="error"]')
    .filter({ hasText: /same data type|must be/i }).first();
  const errored = await complaint.isVisible().catch(() => false);
  const mismatch = series.some((v) => !got.includes(v)) || got.length !== series.length;

  return {
    ok: !errored && !mismatch,
    series: got,
    why: errored ? 'the chart still reports mixed data types'
       : mismatch ? `series came out as ${got.join(', ') || '(none)'}`
       : undefined,
  };
}

// Leaving the query block's chart pane.
//
// Saving a chart re-renders the block, and the pane comes back in its default state —
// every variable selected as a series again, so the red "same data type" banner returns
// and sits there for as long as the document stays in Properties. The chart that was
// just saved is fine; this is the pane behind it (FINDINGS.md #9).
//
// The honest way not to film it is not to stand in front of it: the pane's work is done,
// so the block goes back to its View tab. Returns false when there is no tab to click.
export async function closeChartPane(page, cursor, row) {
  // Ends-with, not exact: the tab label runs a Material icon ligature straight into the
  // word, so it reads "table_chartView" and an anchored /^View$/ matches nothing and
  // fails silently — the same trap currentViewMode() documents for the mode toggle.
  const tab = row.locator('a, button').filter({ hasText: /View$/ }).first();
  if (!(await tab.count())) return { ok: false, why: 'no View tab on the query block' };

  await tab.scrollIntoViewIfNeeded().catch(() => {});
  await cursor.click(tab);
  await sleep(1400);

  const banner = row.locator('.ac-alert, .alert, [class*="error"]')
    .filter({ hasText: /same data type|must be/i }).first();
  const still = await banner.isVisible().catch(() => false);
  return { ok: !still, why: still ? 'the pane is still showing its error' : undefined };
}

// Creating the document a scene writes into — on camera, from where the scene is.
//
// A write-up document that is reset off camera and then reached by page.goto() is a
// teleport: the viewer sees the opening state, then a different page, with nothing in
// between that they could have clicked. This is the visible route instead. Create ▸
// Item is offered on any container in its default mode, opens an .ac-modal inside the
// active pane (Title required, Description, Primary topic — no slug, so the new
// document gets a UUID path), and Save lands on the new document in Properties.
//
// Because the path is a UUID, a scene cannot reset it by slug beforehand — it removes
// last take's document by TITLE instead (fixture.mjs deleteByTitle) and then creates
// afresh here.
export async function createItem(page, cursor, title) {
  const menu = ui(page).locator('button.drop-toggle').filter({ hasText: 'Create' }).first();
  if (!(await menu.count())) return { ok: false, why: 'no Create button on this document' };

  let entry = null;
  for (let attempt = 1; attempt <= 3 && !entry; attempt++) {
    await cursor.click(menu);
    await sleep(1100);
    // Ends-with: the entry reads "descriptionItem", icon glyph run into the word.
    const e = ui(page).locator('.add-constructor').filter({ hasText: /Item$/ }).first();
    if (await e.isVisible().catch(() => false)) entry = e;
  }
  if (!entry) return { ok: false, why: 'Item not offered by the Create menu' };
  await cursor.click(entry);

  const modal = ui(page).locator('.ac-modal').last();
  const shown = await modal.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
  if (!shown) return { ok: false, why: 'the Item constructor did not open' };
  await sleep(600);

  // By property name: the first control in this modal is not reliably the title.
  const input = modal.locator('.ldh-prop-group').filter({ hasText: 'Title' }).first()
    .locator('input:not([type=hidden]):visible').first();
  if (!(await input.isVisible().catch(() => false))) return { ok: false, why: 'no Title field on the constructor' };
  await cursor.click(input);
  await input.pressSequentially(title, { delay: 55 });
  await sleep(500);

  const btn = modal.locator('button.btn-save, button[class*="btn-save"], button').filter({ hasText: /Save|Create|check/ }).last();
  if (!(await btn.count())) return { ok: false, why: 'no Save on the constructor' };
  const before = page.url();
  await cursor.click(btn);
  await page.waitForFunction((b) => location.href !== b, before, { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3500);

  const url = page.url().split('?')[0];
  if (url === before.split('?')[0]) return { ok: false, why: 'Save did not navigate to a new document' };
  return { ok: true, url };
}

// Creating an instance from a view's own Create button.
//
// Derived inverse views ("Cities in this region", "Orders from this customer") carry
// an add-instance button typed to the class they list (client/block/view.xsl:493).
// The constructor opens as a modal inside the active pane; its fields come from the
// class's shape, so they are filled BY LABEL against `values` — a map of regexes to
// strings — and every field the shape asks for that nothing matched is reported, so a
// first run says what the form wanted instead of failing quietly.
export async function createFromView(page, cursor, values) {
  const btn = ui(page).locator('button.add-instance').first();
  const shown = await btn.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false);
  if (!shown) return { ok: false, why: 'no Create button on any view here' };
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await cursor.click(btn);

  const modal = ui(page).locator('.modal-constructor, .ac-modal').last();
  if (!(await modal.waitFor({ state: 'visible', timeout: 12_000 }).then(() => true, () => false))) {
    return { ok: false, why: 'the constructor did not open' };
  }
  await sleep(800);

  const groups = modal.locator('.ldh-prop-group');
  const n = await groups.count();
  const filled = []; const unmatched = [];
  for (let i = 0; i < n; i++) {
    const g = groups.nth(i);
    const label = ((await g.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
    const input = g.locator('input:not([type=hidden]):visible, textarea:visible').first();
    if (!(await input.count())) continue;
    const current = await input.inputValue().catch(() => '');
    if (current) continue; // prefilled by the inverse — leave it
    const key = Object.keys(values).find((re) => new RegExp(re, 'i').test(label));
    if (!key) { unmatched.push(label.slice(0, 30)); continue; }
    await cursor.click(input);
    await input.pressSequentially(values[key], { delay: 45 });
    filled.push(`${label.split(' ')[0]}=${values[key]}`);
    await sleep(300);
  }

  const save = modal.locator('button.btn-save, button[class*="btn-save"], button').filter({ hasText: /Save|Create|check/ }).last();
  if (!(await save.count())) return { ok: false, why: 'no Save on the constructor', unmatched };
  const before = page.url();
  await cursor.click(save);
  await page.waitForFunction((b) => location.href !== b, before, { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3500);
  const url = page.url().split('?')[0];
  return { ok: true, navigated: url !== before.split('?')[0], url, filled, unmatched };
}
