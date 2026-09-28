// "A new product."
//
// Opens on the categories grid. Beverages leads to its own product list — the derived
// "Products in this category" view, which carries a Create button — and the product is
// created there, category already filled in, supplier picked by name. The same list is
// read again: thirteen.
//
//   make scene SCENE=13-a-new-product BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { createItem, createFromView } from '../lib/constructors.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/categories/`;
const TITLE = 'A new product';
const CATEGORY = 'Beverages';
const SUPPLIER = 'Exotic Liquids';
const PRODUCT = 'Exotic Liquids Ginger Beer';

for (const t of [TITLE, PRODUCT]) {
  const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: t });
  console.log(`cleanup: removed ${gone.removed.length} earlier "${t}"`);
}
let url = null;

await runScene({
  id: '13-a-new-product',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    const list = () => page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Products in this category' }).first();
    const count = async () => (await list().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();

    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')].filter((i) => i.complete && i.naturalWidth > 0).length >= 8,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('grid', 'eight categories, photographed');
    await sleep(2200);

    const tile = page.locator('.ldh-pane.is-active .ldh-grid-block a.card').filter({ has: page.locator('.ti', { hasText: new RegExp(`^\\s*${CATEGORY}\\s*$`) }) }).first();
    if (!(await tile.count())) throw new Error(`no ${CATEGORY} tile`);
    await cursor.click(tile);
    await page.waitForLoadState('load').catch(() => {});
    await list().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    await sleep(2200);
    const before = await count();
    await marks.beat('category', `${CATEGORY} — its ${before} products, listed on its own page, with a Create button`);
    await sleep(2600);

    // ── say why, before the work ────────────────────────────────────────────
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p1 = await addProse(page, cursor, type,
      `${SUPPLIER}, who supply Chai and Chang, have added a ginger beer. ${CATEGORY} lists its products on its own page and carries a Create button, so the product is created where it will be listed, with the category already filled in.`);
    await marks.beat('question', p1.ok ? 'the job, written down' : p1.why);
    await sleep(3200);

    // ── back to the category, and the product created from its own list ────
    const back = await searchGo(page, cursor, CATEGORY, { type: 'Category' });
    await marks.beat('back-to-category', back.ok ? `${CATEGORY}, found by name` : back.why);
    if (!back.ok) throw new Error(back.why);
    const made2 = await createFromView(page, cursor, {
      '^Title': PRODUCT, '^Name': PRODUCT, '^Identifier': '78', '^Description': '24 - 355 ml bottles', '^Provider': [SUPPLIER, 'Company'],
    }, { type, view: 'Products in this category' });
    await marks.beat('product', made2.ok
      ? `${PRODUCT} — created from the category's own list${made2.unmatched?.length ? '; unfilled: ' + made2.unmatched.join(', ') : ''}`
      : `${made2.why}${made2.unmatched?.length ? '; fields: ' + made2.unmatched.join(', ') : ''}`);
    if (!made2.ok) throw new Error(made2.why);
    await sleep(2400);

    // ── the same list, read again ───────────────────────────────────────────
    const link = page.locator('.ldh-pane.is-active .ldh-block a').filter({ hasText: new RegExp(`^\\s*${CATEGORY}\\s*$`) }).first();
    if (!(await link.count())) throw new Error('the product page does not link its category');
    await cursor.click(link);
    await page.waitForLoadState('load').catch(() => {});
    await list().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    await sleep(2500);
    await marks.beat('category-again', `${CATEGORY} — the same list, read again: ${await count()} products`);
    await sleep(2600);

    // ── the page, with the product on it ────────────────────────────────────
    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const o1 = await addObject(page, cursor, type, null, { label: PRODUCT, kind: 'Product', mode: 'Properties' });
    await marks.beat('embed', o1.ok ? 'the product, embedded' : o1.why);
    await sleep(1400);
    const p2 = await addProse(page, cursor, type,
      `${PRODUCT}: ${CATEGORY}'s thirteenth product, from ${SUPPLIER}. The category listed ${before} when this page was opened; it lists one more now.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 5600 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
