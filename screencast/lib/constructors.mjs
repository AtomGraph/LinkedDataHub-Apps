// Creating instances of the ontology's classes.
//
// The Create menu is mode-gated: in ContentMode it offers only the two block types,
// because those are the only things allowed as rdf:_N content. Switch the document
// to Properties and it offers every class the ontology declares — SELECT, View,
// Result set chart, the import types, File, Service.
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
  await page.keyboard.type(query, { delay: 14 });
  await sleep(1200);

  const written = await page.evaluate(() => {
    const cm = document.querySelector('.ldh-pane.is-active .CodeMirror');
    return cm?.CodeMirror ? cm.CodeMirror.getValue() : null;
  }).catch(() => null);

  if (written === null) return { ok: true, lines: query.split('\n').length, verified: false };

  // Compare ignoring the indentation the editor added for us.
  const flat = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  const matched = flat(written) === flat(query);
  return {
    ok: matched,
    lines: written.split('\n').length,
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
