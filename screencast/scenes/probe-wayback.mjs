// Not a scene. Which visible route reaches a page created a minute ago?
// Creates one, navigates away by the drawer search, then tests: app tabs, search,
// the drawer tree, and Root's children list. Removes the page afterwards.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { createItem } from '../lib/constructors.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo, searchGo, openTree } from '../lib/nav.mjs';
import { ui } from '../lib/dom.mjs';

const opts = await resolve('/');
const { target, identity, base } = opts;
const TITLE = 'Wayback probe page';

await runScene({
  id: 'probe-wayback', target, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(target, { waitUntil: 'load' });
    await sleep(5000);
    const made = await createItem(page, cursor, TITLE);
    console.log('  created:', JSON.stringify(made));
    if (!made.ok) return;
    await sleep(1500);

    const away = await searchGo(page, cursor, '11074', { type: 'Order' });
    console.log('  navigated away:', JSON.stringify(away));
    await sleep(2500);

    console.log('  app tabs:', await page.evaluate(() => JSON.stringify(
      [...document.querySelectorAll('.ldh-tab, [role="tab"], .ldh-tabs a, .ldh-tabs button, .ldh-tabbar a, .ldh-tabbar button')]
        .filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)))));

    const s = await searchGo(page, cursor, TITLE, { type: 'Item' });
    console.log('  search for title:', JSON.stringify(s));
    await sleep(1500);
    await page.keyboard.press('Escape').catch(() => {});

    const treeOpen = await openTree(page, cursor);
    console.log('  tree open:', treeOpen, '| entries containing title:', await page.evaluate((t) => JSON.stringify(
      [...document.querySelectorAll('.tree-link')].filter((e) => e.innerText.includes(t))
        .map((e) => ({ visible: e.offsetParent !== null, text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 40) }))), TITLE),
      '| total tree links:', await page.locator('.tree-link').count());
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(800);

    const up = await crumbGo(page, cursor, 'Root');
    console.log('  breadcrumb Root:', JSON.stringify(up));
    await sleep(4000);
    console.log('  root children list has title link:', await ui(page).locator('a').filter({ hasText: TITLE }).count(),
      '| pager:', await page.evaluate(() => JSON.stringify([...document.querySelectorAll('.ldh-pane.is-active .count b, .ldh-pane.is-active .pager-next')].map((e) => e.innerText.trim().slice(0, 20)))));

    const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
    console.log('  cleanup:', JSON.stringify(gone));
  },
}, {});
