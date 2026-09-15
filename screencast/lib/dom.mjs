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
