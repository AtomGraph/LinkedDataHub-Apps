// Adding blocks to a document, on camera.
//
// A ContentMode document offers two block-add affordances, and only in ContentMode
// — a bare document with no blocks opens in ReadMode and shows neither. XHTML opens
// an inline RDFa editor that autosaves on focusout; Object opens an inline form with
// a Value typeahead and an explicit Save.
//
// Both are how the Northwind pages themselves are built, so a scene using them is
// authoring in the app's own idiom rather than a demo-only path.

import { ui, settled } from './dom.mjs';
import { field } from './constructors.mjs';

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

// Looking a resource up by its name.
//
// Any resource can be found in a combobox by its title, name or label, without
// knowing its URI beforehand — the app resolves the label and binds the URI itself,
// on camera, so nothing out-of-band is typed. This replaces the
// navigate-copy-return errand wherever the title is known.
//
// Each suggestion is `li.ac-cb-item`, carrying the URI in @title and in a hidden
// input[name=ou], with the label in .ac-cb-item-lbl and the resource's type beside
// it. The type is load-bearing: "All customers" offers both an Object and a View,
// which is the inner-versus-outer distinction settled without a copy at all — ask
// for the View and the wrapping Object cannot be picked by mistake.
export async function pickByLabel(page, cursor, type, input, label, { kind = null, timeout = 10000 } = {}) {
  await cursor.click(input);
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+A`);
  await page.keyboard.press('Backspace');
  await type(input, label, { base: 26, spread: 10 });

  // The panel belongs to THIS input. A form has one per combobox (imports/default
  // .xsl:1280 puts it beside the .ac-cb-box holding the input), so taking the first
  // in the document reads a different combobox's results — which is how a lookup
  // that had in fact resolved came back "panel opened empty".
  // The panel belongs to THIS input. In a form it sits inside the input's
  // .ac-combobox wrapper; the annotation overlay's property and object comboboxes
  // have no such wrapper, so fall back to the nearest panel that is actually open.
  const wrapped = input.locator('xpath=ancestor::div[contains(@class,"ac-combobox")][1]')
    .locator('.ac-cb-panel[role="listbox"]');
  const panel = (await wrapped.count())
    ? wrapped.first()
    : page.locator('.ac-cb-panel[role="listbox"]:visible').first();

  // Waiting for it to become visible proves nothing either: onfocusin already fills
  // it from the subjects present in the form itself (form.xsl:2400), so it is up
  // before a key is pressed and its one entry is the block being created. The store
  // lookup is a separate onkeyup handler behind a 400ms debounce and an HTTP round
  // trip (form.xsl:1932) — so what has to be waited for is a suggestion that answers
  // the search.
  const needle = label.trim().toLowerCase().slice(0, 12);
  const arrived = await panel.locator('li.ac-cb-item')
    .filter({ hasText: new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    .first().waitFor({ state: 'visible', timeout })
    .then(() => true, () => false);
  if (!arrived) {
    const shown = await panel.locator('li.ac-cb-item').allInnerTexts().catch(() => []);
    return { ok: false, why: `no suggestion matched "${label}" — panel offered ${shown.length ? shown.slice(0, 5).map((t) => JSON.stringify(t.replace(/\n/g, ' '))).join(' ') : '(nothing)'}` };
  }
  await sleep(500);

  const items = panel.locator('li.ac-cb-item');
  const n = await items.count();
  if (!n) return { ok: false, why: `the panel opened empty for "${label}"` };

  const wanted = label.trim().toLowerCase();
  let best = null;
  for (let i = 0; i < n; i++) {
    const text = (await items.nth(i).innerText().catch(() => '')).trim();
    const shown = (await items.nth(i).locator('.ac-cb-item-lbl').innerText().catch(() => text)).trim();
    const uri = await items.nth(i).getAttribute('title').catch(() => null);
    let score = 0;
    if (shown.toLowerCase() === wanted) score += 4;
    else if (shown.toLowerCase().startsWith(wanted)) score += 2;
    else if (shown.toLowerCase().includes(wanted)) score += 1;
    // the type follows the label, so a kind is matched against what is left of it
    if (kind) {
      const rest = text.slice(shown.length).trim().toLowerCase();
      if (rest === kind.toLowerCase()) score += 4; else score -= 2;
    }
    if (!best || score > best.score) best = { i, score, shown, uri, text };
  }
  if (!best || best.score <= 0) {
    const seen = [];
    for (let i = 0; i < Math.min(n, 6); i++) seen.push(JSON.stringify((await items.nth(i).innerText().catch(() => '')).trim()));
    return { ok: false, why: `nothing matched "${label}"${kind ? ` as ${kind}` : ''} — offered ${seen.join(' ')}` };
  }

  await cursor.click(items.nth(best.i));
  await sleep(900);
  return { ok: true, uri: best.uri, label: best.shown, of: n };
}

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
export async function addObject(page, cursor, type, uri, { mode = null, settle = 3000, paste = false, label = null, kind = null } = {}) {
  const btn = addButton(page, 'Object');
  if (!(await btn.count())) return { ok: false, why: 'no + Object button' };

  const form = ui(page).locator('form').filter({ has: page.locator('button.btn-save') }).last();
  // By property name, never by position: the first control in this form is not
  // reliably the one labelled Value.
  const value = field(page, 'Value', 'input:not([type=hidden]):visible');

  let ready = false;
  for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
    await btn.scrollIntoViewIfNeeded();
    await cursor.click(btn);
    ready = await value.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  }
  if (!ready) return { ok: false, why: 'Object form did not open after three presses' };

  // Looking the resource up by name is the short way round: no navigate, copy and
  // return, and the combobox's own type labels pick the view rather than the Object
  // wrapping it. A pasted URI is the fallback for what the lookup cannot reach.
  let picked = null;
  if (label) {
    picked = await pickByLabel(page, cursor, type, value, label, { kind });
    if (!picked.ok) return { ok: false, why: picked.why };
  } else {
    await cursor.click(value);
    if (paste) {
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+V`);
    } else {
      await type(value, uri, { base: 26, spread: 10 });
    }
    await sleep(1600);

    const suggestion = ui(page).locator('.ac-cb-panel[role="listbox"] li.ac-cb-item').first();
    if (await suggestion.isVisible().catch(() => false)) {
      await cursor.click(suggestion);
      await sleep(800);
    }
  }

  if (mode) {
    const modeSelect = field(page, 'Layout mode', 'select:visible');
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
export async function switchDocumentMode(page, cursor, mode = 'content-mode', { settle = 3000 } = {}) {
  const toggle = ui(page).locator('button.layout-modes.drop-toggle, button[title="Mode"]').first();
  const item = ui(page).locator(`.modes-pop a.mi.${mode}`).first();
  for (let i = 0; i < 3; i++) {
    if (!(await toggle.count())) return false;
    await cursor.click(toggle);
    await sleep(700);
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await page.waitForLoadState('load').catch(() => {});
      await settled(page, 3000);
      return true;
    }
  }
  return false;
}
