// Adding blocks to a document, on camera.
//
// A ContentMode document offers two block-add affordances, and only in ContentMode
// — a bare document with no blocks opens in ReadMode and shows neither. XHTML opens
// an inline RDFa editor that autosaves on focusout; Object opens an inline form with
// a Value typeahead and an explicit Save.
//
// Both are how the Northwind pages themselves are built, so a scene using them is
// authoring in the app's own idiom rather than a demo-only path.

import { ui } from './dom.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const CONTENT_MODE = 'https://w3id.org/atomgraph/linkeddatahub#ContentMode';

// Probe-only. A scene must reach ContentMode with switchDocumentMode() — building a
// ?mode= URL is the address-bar form of pasting a URI you were not given.
export function contentModeUrl(documentUrl) {
  const u = new URL(documentUrl);
  u.searchParams.set('mode', CONTENT_MODE);
  return u.toString();
}

// Scoped to the active pane: a background tab's add buttons are in the DOM too.
const addButton = (page, kind) =>
  ui(page).locator('button.create-action.add-constructor').filter({ hasText: kind }).first();

// Prose. The editor autosaves when focus leaves it, so the beat is: open, type,
// look away — no Save to hunt for.
export async function addProse(page, cursor, type, text, { settle = 1800, heading = false } = {}) {
  const btn = addButton(page, 'XHTML');
  if (!(await btn.count())) return { ok: false, why: 'no + XHTML button — is the document in ContentMode?' };

  // The editor sometimes does not come up on the first press — a cold cache after a
  // proxy restart is enough to lose it. One press is a flake; three is a fault.
  const editable = ui(page).locator('.rdfa-editor-content [contenteditable]').first();
  let opened = false;
  for (let attempt = 1; attempt <= 3 && !opened; attempt++) {
    await btn.scrollIntoViewIfNeeded();
    await cursor.click(btn);
    opened = await editable.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  }
  if (!opened) return { ok: false, why: 'editor did not open after three presses' };

  await cursor.click(editable);
  await sleep(300);
  await type(editable, text, { base: 42, spread: 18 });

  // NOT USED. The block-type select replaces the editable node, and the replacement
  // is never autosaved — a heading block ends up written to nothing and the page
  // loses it entirely. Documents already show their title in the breadcrumb, so the
  // structure this bought was not worth a lost block. Left here as a record of what
  // does not work.
  if (heading) {
    const kind = ui(page).locator('.editor-bar select, .rdfa-editor-ui select').first();
    if (await kind.count()) {
      const labels = await kind.locator('option').allTextContents();
      const want = labels.find((l) => /heading\s*2|^h2$/i.test(l.trim()))
        ?? labels.find((l) => /heading/i.test(l.trim()));
      if (want) {
        await kind.selectOption({ label: want.trim() }).catch(() => {});
        await sleep(700);
      }
    }
  }
  await sleep(600);

  // Focusout is the save. Clicking the page body is what a person would do.
  await page.locator('body').click({ position: { x: 40, y: 400 } }).catch(() => {});
  await sleep(settle);
  return { ok: true };
}

// A reference: embeds an existing resource — a view, a chart, another document — as
// a block in this one.
// `uri` may be a literal string, but scenes should pass { paste: true } instead and
// have put the value on the clipboard with copyUri() — see the no-out-of-band-URIs
// rule. Typing a URI the script merely knows is a step the viewer cannot reproduce.
export async function addObject(page, cursor, type, uri, { mode = null, settle = 3000, paste = false } = {}) {
  const btn = addButton(page, 'Object');
  if (!(await btn.count())) return { ok: false, why: 'no + Object button' };

  const form = ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last();
  const value = form.locator('input[name="ou"]:visible, input[type="text"]:visible, input[type="url"]:visible, input[type="search"]:visible').first();

  let ready = false;
  for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
    await btn.scrollIntoViewIfNeeded();
    await cursor.click(btn);
    ready = await value.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  }
  if (!ready) return { ok: false, why: 'Object form did not open after three presses' };

  await cursor.click(value);
  if (paste) {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+V`);
  } else {
    await type(value, uri, { base: 26, spread: 10 });
  }
  await sleep(1600);

  // The field is a typeahead; take the suggestion if one is offered.
  const suggestion = ui(page).locator('.typeahead .active, .typeahead li, ul.typeahead a, .ac-menu-item').first();
  if (await suggestion.isVisible().catch(() => false)) {
    await cursor.click(suggestion);
    await sleep(800);
  }

  if (mode) {
    const modeSelect = form.locator('select').last();
    if (await modeSelect.count()) await modeSelect.selectOption({ label: mode }).catch(() => {});
    await sleep(600);
  }

  const save = form.locator('button.btn-save').first();
  if (!(await save.count())) return { ok: false, why: 'no Save on the Object form' };
  await cursor.click(save);
  await sleep(settle);
  return { ok: true };
}

// Copying a URI the way a person does.
//
// A scene must never type a URI it happens to know into a field or the address bar.
// To reference a resource it navigates to it, presses the app's own copy control,
// and carries the value back on the clipboard — so the viewer sees where it came
// from and the path is one they could repeat.
// `match` names the resource wanted — a fragment of its URI — because a document
// holding several created resources answers "the first copy control" with whichever
// came first. Without it, the innermost control wins: a block that shows a view
// wraps it, and copying the wrapper's URI into a new block nests them into two
// stacked headers for one piece of content.
export async function copyUri(page, cursor, within, { match = null } = {}) {
  const scope = within ?? ui(page);
  const all = scope.locator('.btn-copy-uri, button[class*="copy-uri"]');
  const n = await all.count();
  if (!n) return { ok: false, why: 'no copy-URI control here' };

  let btn = all.last(); // innermost in document order: the embedded resource's own
  if (match) {
    for (let i = 0; i < n; i++) {
      const candidate = all.nth(i);
      const about = await candidate.evaluate(
        (e) => e.closest('[about]')?.getAttribute('about') ?? '',
      ).catch(() => '');
      if (about.includes(match)) { btn = candidate; break; }
    }
  }

  // On a resource page the control is hover-revealed rather than always drawn — a
  // block header shows it, a card does not until the pointer is over it. Hovering
  // the thing that owns it is what a person does, and it is what makes it clickable.
  // A proxied page can still be rendering when the scene arrives, so the control is
  // waited for rather than sampled once.
  await btn.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {});

  if (!(await btn.isVisible().catch(() => false))) {
    for (const sel of ['.ldh-block', '.row-main', '[about]', 'main']) {
      const host = scope.locator(sel).first();
      if (!(await host.count())) continue;
      // Short leash: an invisible host costs 30s at the default timeout, and four
      // of those is two minutes spent discovering the obvious.
      await host.hover({ timeout: 2500 }).catch(() => {});
      await sleep(500);
      if (await btn.isVisible().catch(() => false)) break;
    }
  }
  if (!(await btn.isVisible().catch(() => false))) return { ok: false, why: 'copy-URI control never became visible' };

  await cursor.click(btn);
  await sleep(900);
  const value = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  return { ok: true, value };
}

// The document-level mode switcher, for reaching ContentMode without inventing a
// ?mode= query string.
export async function switchDocumentMode(page, cursor, mode = 'content-mode') {
  const toggle = ui(page).locator('button.layout-modes.drop-toggle, button[title="Mode"]').first();
  const item = ui(page).locator(`.modes-pop a.mi.${mode}`).first();
  for (let i = 0; i < 3; i++) {
    if (!(await toggle.count())) return false;
    await cursor.click(toggle);
    await sleep(700);
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(3000);
      return true;
    }
  }
  return false;
}
