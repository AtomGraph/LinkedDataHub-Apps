// Creating instances of the ontology's classes.
//
// The Create menu is mode-gated: in ContentMode it offers only the two block types,
// because those are the only things allowed as rdf:_N content. Switch the document
// to Properties and it offers every class the ontology declares — SELECT, View,
// Result set chart, the import types, File, Service.
//
// The form renders inline on the document rather than in a modal, because the
// resource being created belongs to this document.

import { ui } from './dom.mjs';

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
      await sleep(3000);
      return { ok: true };
    }
  }
  return { ok: false, why: `${label} not offered by the Create menu` };
}

// The query text field is a CodeMirror, which ignores value assignment — only real
// keystrokes reach it. Its bracket auto-closing types over a closing brace the
// author supplies, so the query can be written out in full.
export async function typeQuery(page, cursor, query) {
  const code = ui(page).locator('.CodeMirror, .yasqe').first();
  if (!(await code.isVisible().catch(() => false))) return { ok: false, why: 'no query editor on the form' };
  await cursor.click(code);
  await sleep(400);
  await page.keyboard.type(query, { delay: 18 });
  await sleep(900);
  return { ok: true };
}

// Fills a labelled text field on the inline form.
export async function fill(page, cursor, label, value) {
  const row = ui(page).locator('.ldh-block-row, .row-main, form').filter({ hasText: label }).last();
  const input = row.locator('input[type="text"]:visible, input:not([type]):visible, input[name="ol"]:visible').first();
  if (!(await input.isVisible().catch(() => false))) return { ok: false, why: `no field for ${label}` };
  await cursor.click(input);
  await input.pressSequentially(value, { delay: 55 });
  await sleep(500);
  return { ok: true };
}

// The inline form's own Save, not the document action bar's.
export async function save(page, cursor) {
  const btn = ui(page).locator('button.btn-save, button[class*="btn-save"]').last();
  if (!(await btn.isVisible().catch(() => false))) return { ok: false, why: 'no Save on the form' };
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await cursor.click(btn);
  await sleep(3200);
  return { ok: true };
}
