// Where to look.
//
// LinkedDataHub keeps every open tab's pane in the DOM and marks one `is-active`.
// Following a link into another dataspace opens a new tab, so the previous page's
// markup stays behind, hidden but matchable. Any locator written against the whole
// page can therefore resolve to an element in a pane nobody is looking at — which
// is not a flake, it is a scene driving the wrong tab.
//
// Everything a scene touches goes through here.

// A comma selector must have every alternative scoped, not just the first: naive
// concatenation yields `.pane .a, .b`, where `.b` is still page-wide and, being
// earlier in the DOM, is exactly what .first() then returns from a stale tab.
export function scoped(selector, prefix = '.ldh-pane.is-active') {
  return selector
    .split(',')
    .map((part) => `${prefix} ${part.trim()}`)
    .join(', ');
}

export function ui(page) {
  return {
    locator: (selector, options) => page.locator(scoped(selector), options),
    page,
  };
}

// Some chrome lives outside the panes altogether — the drawer, the applications
// menu, the action bar — so those keep using the page directly.
export function chrome(page) {
  return page;
}

// How long a settle actually takes is the app's business, not the scene's. LDH marks
// a block that is still fetching with .is-loading, and the tree and facet popovers
// carry their own; when none of them is on screen the page has finished. The cap is
// what the fixed sleep used to be, so a slow render is no worse than before and a
// fast one costs nothing.
export async function settled(page, cap = 3500) {
  await page.waitForFunction(
    () => !document.querySelector('.is-loading, .facet-loading, .tree-loading'),
    null, { timeout: cap },
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 250));
}
