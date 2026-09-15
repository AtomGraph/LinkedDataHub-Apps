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
  if (await page.locator('.tree-link').first().isVisible().catch(() => false)) return true;

  // Approach the edge so it reads as a movement, then land exactly on x=0.
  await cursor.moveTo(240, 420, { duration: 420 });
  await cursor.moveTo(0, 420, { duration: 380 });
  await page.mouse.move(0, 424); // the handler tests clientX = 0 exactly
  await sleep(500);

  const opened = await page.waitForFunction(
    (sel) => !!document.querySelector(`${sel}.is-open`),
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
  await sleep(3800);
  return { ok: true };
}

// Jumping straight to a resource by name.
//
// The sidebar search is a typeahead over resources, so it is the shortest route to
// a specific document — faster than walking the tree when the target is not a
// sibling. It lives inside the drawer, so it carries the same precondition, and its
// results must be clicked: Enter does not navigate.
export async function searchGo(page, cursor, query, { match = query, timeout = 8000 } = {}) {
  if (!(await openTree(page, cursor))) return { ok: false, why: 'drawer would not open' };

  const box = page.locator('.sb-search input[name="q"], input[type="search"][name="q"]').first();
  if (!(await box.isVisible().catch(() => false))) return { ok: false, why: 'no search box in the drawer' };

  await cursor.click(box);
  await box.pressSequentially(query, { delay: 70 });

  const results = page.locator('.typeahead a, .typeahead li, .ac-menu-item, [class*="result"] a');
  const found = await page.waitForFunction(
    () => document.querySelectorAll('.typeahead a, .typeahead li, .ac-menu-item').length > 0,
    null, { timeout },
  ).then(() => true, () => false);
  if (!found) return { ok: false, why: `no results for ${query}` };
  await sleep(700);

  const hit = results.filter({ hasText: match }).first();
  const target = (await hit.count()) ? hit : results.first();
  const href = await target.getAttribute('href').catch(() => null);
  await cursor.click(target);
  await page.waitForLoadState('load').catch(() => {});
  await sleep(3600);
  return { ok: true, href };
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
  await sleep(2500);

  const active = await page.locator('.ldh-pane.is-active').first()
    .textContent().then((t) => t ?? '').catch(() => '');
  const tabClass = await tab.getAttribute('class').catch(() => '') ?? '';
  const ok = tabClass.includes('is-active') || active.length > 0;
  return ok ? { ok: true } : { ok: false, why: `clicked ${label} but the pane did not follow` };
}
