// Annotating a word in prose with a statement.
//
// This is how an arbitrary triple is written through the UI. The resource edit form
// cannot do it: that form is ontology-driven, and its Add button only offers the
// properties the class declares — for a schema:ProductGroup that is rdf:type and
// nothing else. The RDFa editor can, because prose annotation is not constrained by
// the subject's class.
//
// The overlay opens on **contextmenu**, not on a toolbar button and not on a plain
// click — `rdfa-editor/annotate.xsl:21` matches `*[@contenteditable='true']` in mode
// ixsl:oncontextmenu, so that "plain clicks never open the overlay and the caret
// stays usable while editing text".

import { pickByLabel } from './blocks.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Puts the caret through a real double-click, which selects the word and fires the
// editor's own selection handling — a programmatic Range does neither.
export async function selectWord(page, word) {
  const box = await page.evaluate((w) => {
    const eds = [...document.querySelectorAll('[contenteditable]')].filter((e) => e.isContentEditable);
    const ed = eds.find((e) => e.textContent.toLowerCase().includes(w.toLowerCase()));
    if (!ed) return null;
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const i = n.textContent.toLowerCase().indexOf(w.toLowerCase());
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i); r.setEnd(n, i + w.length);
      const b = r.getBoundingClientRect();
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    }
    return null;
  }, word);
  if (!box) return null;
  await page.mouse.dblclick(box.x, box.y);
  await sleep(900);
  const got = await page.evaluate(() => String(getSelection()).trim());
  return got.toLowerCase() === word.toLowerCase() ? box : null;
}

export async function annotate(page, cursor, type, { word, property }) {
  const at = await selectWord(page, word);
  if (!at) return { ok: false, why: `could not select "${word}" in the prose` };

  await page.mouse.click(at.x, at.y, { button: 'right' });
  // #rdfa-editor-overlay, class "rdfa-editor-ui" — the word "overlay" is in the id,
  // not the class (rdfa-editor/overlay.xsl:35). The page carries one per editor
  // instance, all sharing that id, so the selector has to take the visible one:
  // matching on the id alone is ambiguous and every query against it errors.
  const overlay = page.locator('#rdfa-editor-overlay:visible').first();
  if (!(await overlay.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false))) {
    return { ok: false, why: 'the annotation overlay did not open' };
  }
  await sleep(600);

  const prop = overlay.locator('input.property-combobox').first();

  const p = await pickByLabel(page, cursor, type, prop, property, { timeout: 9000 });
  if (!p.ok) { await page.keyboard.press('Escape'); return { ok: false, why: `property: ${p.why}` }; }

  // Text is the default: a literal object. A resource needs the Link side.
  const link = overlay.locator('button.ac-switch-seg').filter({ hasText: /^Link$/ }).first();
  if (await link.count()) { await cursor.click(link); await sleep(800); }

  // After the Link switch the literal field is replaced by a resource combobox. The
  // last visible input is NOT it — the language field survives the switch — so the
  // object input is named explicitly.
  // The object field is a plain URI input — name="object", no combobox class, and
  // typing a label opens no panel. So unlike the property, the object cannot be
  // looked up by name here: its URI has to arrive on the clipboard, copied from the
  // resource's own control. Which is the rule, not a workaround — a URI is fetched,
  // never known.
  const objInput = overlay.locator('input[name="object"]').first();
  await cursor.click(objInput);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  await sleep(900);
  const pasted = await objInput.inputValue().catch(() => '');
  if (!pasted.startsWith('http')) {
    await page.keyboard.press('Escape');
    return { ok: false, why: `nothing usable on the clipboard for the object (got "${pasted.slice(0, 40)}")` };
  }

  const go = overlay.locator('button.ac-btn').filter({ hasText: /^Annotate$/ }).first();
  if (!(await go.count())) { await page.keyboard.press('Escape'); return { ok: false, why: 'no Annotate button' }; }
  await cursor.click(go);
  await sleep(1800);

  // Annotate only writes into the editor's DOM. The block is persisted the way the
  // RDFa editor always persists — on focusout — so the edit has to be left before the
  // statement exists anywhere but the page.
  //
  // NOT with Escape: Escape closes the editor without saving, which is precisely why
  // it is the safe way to back out of an edit. Clicking away is what commits.
  const heading = page.locator('.ldh-pane.is-active h1, .ldh-pane.is-active .ac-breadcrumb').first();
  if (await heading.count()) await heading.click({ force: true }).catch(() => {});
  else await page.mouse.click(700, 120);
  await sleep(4000);

  return { ok: true, property: p.label, uri: pasted };
}
