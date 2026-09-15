// Switching a view's layout mode — and not switching it when it is already there.
//
// A scene that opens the mode menu to select the mode already in force films a menu
// opening and closing for nothing. Worse, it reads as a script working through a
// list rather than a person choosing a view. The active mode is on the toggle's own
// label, so it can be read without opening anything.

import { ui } from './dom.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The label the toggle shows for each mode class.
const LABELS = {
  'read-mode': 'Properties',
  'list-mode': 'List',
  'table-mode': 'Table',
  'grid-mode': 'Grid',
  'map-mode': 'Map',
  'chart-mode': 'Chart',
  'graph-mode': 'Graph',
};

const toggleOf = (page) => ui(page).locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first();

export async function currentViewMode(page) {
  const toggle = toggleOf(page);
  if (!(await toggle.count())) return null;
  const text = (await toggle.textContent().catch(() => '')).replace(/expand_more/g, '').trim();
  for (const [cls, label] of Object.entries(LABELS)) {
    // The label appears twice — once as the icon ligature, once as the word.
    if (new RegExp(`\\b${label}\\b`).test(text)) return cls;
  }
  return null;
}

// Returns 'already' when no gesture was needed, true when it switched, false when
// the mode is not on offer.
export async function switchViewMode(page, cursor, mode, { settle = 2200, tries = 3 } = {}) {
  if ((await currentViewMode(page)) === mode) return 'already';

  const toggle = toggleOf(page);
  const item = ui(page).locator(`.modes-pop.view-mode-list button.mi.${mode}`).first();
  for (let i = 0; i < tries; i++) {
    if (!(await toggle.count())) return false;
    await cursor.click(toggle);
    await sleep(650);
    if (await item.isVisible().catch(() => false)) {
      await cursor.click(item);
      await sleep(settle);
      return true;
    }
  }
  return false;
}
