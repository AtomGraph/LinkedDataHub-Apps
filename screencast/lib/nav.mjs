import { settled, ui } from './dom.mjs';
// Getting around the way the interface intends.
//
// The document tree lives in a drawer that opens when the pointer reaches the left
// edge — clientX exactly 0, per client/navigation.xsl:303-312 — and closes on
// mouse-out, its own button, or Escape. While closed the subtree carries `inert`,
// so its links are in the DOM but not interactable: a scene that clicks one without
// opening the drawer waits on an element Playwright correctly calls hidden.
//
// The cursor must also stay inside the drawer on the way to the link, since leaving
// it closes it again.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIDEBAR = '.left-sidebar.ldh-sidebar, .ldh-sidebar';

export async function openTree(page, cursor, { timeout = 8000 } = {}) {
  // Scoped to the active pane throughout: LDH keeps inactive tabs in the DOM, so an
  // unscoped .tree-link or .is-open answers for whichever pane is behind the one on
  // screen — which is how the drawer reported itself open in a proxied second tab
  // while the search box that belongs to it was nowhere to be found.
  if (await ui(page).locator('.tree-link').first().isVisible().catch(() => false)) return true;

  // Approach the edge so it reads as a movement, then land exactly on x=0.
  await cursor.moveTo(240, 420, { duration: 420 });
  await cursor.moveTo(0, 420, { duration: 380 });
  await page.mouse.move(0, 424); // the handler tests clientX = 0 exactly
  await sleep(500);

  const opened = await page.waitForFunction(
    (sel) => {
      const pane = document.querySelector('.ldh-pane.is-active') ?? document;
      return !!pane.querySelector(`${sel}.is-open`);
    },
    SIDEBAR, { timeout },
  ).then(() => true, () => false);
  await sleep(600);
  return opened;
}

// Clicks a container or document in the tree by its label.
export async function treeGo(page, cursor, label) {
  if (!(await openTree(page, cursor))) return { ok: false, why: 'drawer would not open' };

  const link = page.locator('.tree-link').filter({ hasText: label }).first();
  if (!(await link.isVisible().catch(() => false))) return { ok: false, why: `no visible tree entry for ${label}` };

  await cursor.click(link);
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3800);
  return { ok: true };
}

// Jumping straight to a resource by name.
//
// The sidebar search is a typeahead over resources, so it is the shortest route to
// a specific document — faster than walking the tree when the target is not a
// sibling. It lives inside the drawer, so it carries the same precondition, and its
// results must be clicked: Enter does not navigate.
// Finding a resource by name — the way a person does when the container is too big
// to scroll and too big to facet.
//
// The drawer's search is an input, not a typeahead: it opens the search dialog on
// submit, and the dialog renders its results as an ordinary view. The previous
// version of this waited on a `.typeahead` that the app has never rendered, so it
// always timed out.
//
// This is the replacement for filtering by a label-valued facet (Name, Title,
// skos:prefLabel), which hangs — see FINDINGS.md #1.
export async function searchGo(page, cursor, query, { match = query, type = null, timeout = 25000 } = {}) {
  if (!(await openTree(page, cursor))) return { ok: false, why: 'drawer would not open' };

  const box = ui(page).locator('.left-sidebar input[name="q"], .sb-search input[name="q"]').first();
  if (!(await box.isVisible().catch(() => false))) return { ok: false, why: 'no search box in the drawer' };

  await cursor.click(box);
  // The drawer keeps the previous search: a second search in one take was typing
  // its term after the first one's and finding nothing.
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+A`);
  await page.keyboard.press('Backspace');
  await box.pressSequentially(query, { delay: 70 });
  await sleep(400);
  await page.keyboard.press('Enter');

  // The dialog is the VISIBLE modal, and the last of those: a closed search dialog
  // from earlier in the take can still be in the DOM, and reading its stale count
  // is how a second search in one take once reported "no results" for a document
  // the first search had found.
  const modal = page.locator('.ac-modal:visible').last();
  if (!(await modal.waitFor({ state: 'visible', timeout }).then(() => true, () => false))) {
    return { ok: false, why: 'the search dialog did not open' };
  }

  // The dialog's results are a view, so the count in its toolbar is the ready signal.
  const counted = await page.waitForFunction(
    () => { const ms = [...document.querySelectorAll('.ac-modal')].filter((m) => m.offsetParent !== null); const m = ms.at(-1); return !!m && /Total results\s+\d/.test(m.textContent); },
    null, { timeout },
  ).then(() => true, () => false);
  if (!counted) return { ok: false, why: `the dialog never reported a result count for ${query}` };
  await sleep(1200);

  const total = Number(((await modal.innerText()).match(/Total results\s+(\d+)/) || [])[1] ?? 0);
  if (!total) return { ok: false, why: `no results for ${query}` };

  // Every result is a link to a document; the dialog's own chrome is not.
  const results = modal.locator('a[href^="http"]').filter({ hasNotText: /^\s*$/ });
  const n = await results.count();

  // Two things make the obvious pick wrong. A result link wraps the whole row, so
  // its text carries the label among the description, date and type as separate
  // lines — substring matching then answers "Beverages" with "Alcoholic beverages".
  // And the triplestore is shared across dataspaces, so a search inside the
  // thesaurus also returns Northwind's own Beverages category. The label has to
  // match a line outright, and a result in the dataspace being searched wins.
  const wanted = match.trim().toLowerCase();
  const origin = new URL(page.url()).origin;
  const scored = [];
  for (let i = 0; i < n; i++) {
    const text = (await results.nth(i).innerText().catch(() => '')).trim();
    const lines = text.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean);
    const href = (await results.nth(i).getAttribute('href').catch(() => '')) || '';
    let score = 0;
    if (lines.some((l) => l === wanted)) score += 4;
    else if (lines.some((l) => l.startsWith(wanted))) score += 2;
    else if (lines.some((l) => l.includes(wanted))) score += 1;
    if (href.startsWith(origin) && !href.includes('?uri=')) score += 3;
    if (type && lines.some((l) => l === type.toLowerCase())) score += 3;
    scored.push({ i, score, text, href });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score === 0) return { ok: false, why: `nothing in the results matched ${match}` };
  const target = results.nth(best.i);
  const label = best.text;
  const href = await target.getAttribute('href').catch(() => null);

  await cursor.click(target);
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3600);
  return { ok: true, href, label, total };
}

// Which document the active pane is actually showing.
//
// A tab switch does not change page.url(), so a scene that has been into another
// dataspace and come back cannot verify where it is from the URL. The address bar
// input belongs to the shell and tracks the front tab, so it is the honest answer —
// and asking is not optional: a write issued against the wrong pane lands silently
// in the wrong dataspace.
export async function activeDocument(page) {
  return page.evaluate(() => {
    const pane = document.querySelector('.ldh-pane.is-active') ?? document;
    const crumb = [...pane.querySelectorAll('.ac-breadcrumb a, .breadcrumb a')].pop();
    const input = document.querySelector('form.ldh-address input[name="uri"]');
    return (crumb && crumb.href) || (input && input.value) || null;
  });
}

// Switching tabs.
//
// Following a link into another dataspace opens a tab rather than navigating, and
// switching back is a CSS toggle: no fetch, no re-render, and — importantly — no
// change to the address. A scene that confirms its whereabouts by reading the URL
// will believe it is still on the remote resource forever, so the check is what the
// active pane holds instead.
export async function goToTab(page, cursor, label) {
  const tab = page.locator('a.ldh-tab').filter({ hasText: label }).first();
  if (!(await tab.count())) return { ok: false, why: `no tab named ${label}` };

  await cursor.click(tab);
  await settled(page, 2500);

  const active = await page.locator('.ldh-pane.is-active').first()
    .textContent().then((t) => t ?? '').catch(() => '');
  const tabClass = await tab.getAttribute('class').catch(() => '') ?? '';
  const ok = tabClass.includes('is-active') || active.length > 0;
  return ok ? { ok: true } : { ok: false, why: `clicked ${label} but the pane did not follow` };
}

// Going up by breadcrumb.
//
// The action bar carries the document's ancestry as pills — `a.bc-pill` inside the
// div[role="navigation"] that document.xsl:300 emits, the current one marked
// `is-current`. It is on every document in every layout mode, graph included, so it
// is the shortest visible route from wherever a scene is back to a container it can
// create in. A page.goto() to the same place shows the viewer nothing; this shows
// them the click.
//
// Ends-with on the label: the pill text runs an icon ligature into the word
// ("folder Root"), the same way the mode toggle and the Create entries do.
export async function crumbGo(page, cursor, label) {
  const pill = page.locator('[role="navigation"] a.bc-pill')
    .filter({ hasText: new RegExp(`${label}\\s*$`) }).first();
  if (!(await pill.count())) return { ok: false, why: `no breadcrumb for ${label}` };
  if (((await pill.getAttribute('class')) ?? '').includes('is-current')) return { ok: 'already' };

  await cursor.click(pill);
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3800);
  return { ok: true };
}

// Opening a page from the list on the container you are standing on.
//
// The route back to a page created a minute ago. Measured: the drawer's search does
// not return it (whatever indexes the search has not seen it yet), the app opens no
// tab for a same-dataspace move, and the tree lists it but would not open from graph
// mode — while the container's own children list shows it at once, on one page. So
// the way back mirrors the way out: breadcrumb up, then this click down.
export async function listGo(page, cursor, title, { timeout = 15_000, pages = 4 } = {}) {
  // The list pages at twenty; a title late in the alphabet is on the next page, and
  // the pager's Next is how a person gets there.
  const link = ui(page).locator('a').filter({ hasText: title }).first();
  let shown = await link.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  for (let i = 1; !shown && i < pages; i++) {
    // The pager's button reads "Next" plus an icon ligature, so the match is loose.
    const next = ui(page).locator('button, a').filter({ hasText: /Next/ }).first();
    if (!(await next.count()) || await next.isDisabled().catch(() => false)) break;
    await next.scrollIntoViewIfNeeded().catch(() => {});
    await cursor.click(next);
    await sleep(1800);
    shown = await link.waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false);
  }
  if (!shown) return { ok: false, why: `${title} is not listed on this page` };
  await link.scrollIntoViewIfNeeded().catch(() => {});
  await cursor.click(link);
  await page.waitForLoadState('load').catch(() => {});
  await settled(page, 3800);
  return { ok: true };
}
