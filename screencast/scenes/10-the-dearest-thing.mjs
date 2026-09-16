// "The dearest thing in the catalogue."
//
// Opens on the categories grid — eight photographs. Beverages leads to its own product
// list (the derived "Products in this category" view), and one price in it is ten
// times the rest: Côte de Blaye at $263.50 with nineteen buyers and a page that says
// the price, the supplier and nothing about the wine. This scene writes onto THAT page:
// what is published about it — the thesaurus's concept for winemaking, fetched through
// the proxy, and a video from its appellation, pasted in as a link and rendered as a
// resource. Every block it leaves is stripped again before the next take.
//
//   make scene SCENE=10-the-dearest-thing BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { clearBlocks } from '../lib/fixture.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { addProse, addObject, switchDocumentMode } from '../lib/blocks.mjs';
import { goToTab, searchGo, activeDocument } from '../lib/nav.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/categories/`;
const CATEGORY = 'Beverages';
const CONCEPT = 'Winemaking';
const VIDEO = 'https://www.youtube.com/watch?v=B-m8UoieRLs';

// The dearest product, read from the data — its name, price, page and buyers.
const [top] = await sparql(base, `PREFIX schema: <https://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?product ?name ?price (COUNT(DISTINCT ?customer) AS ?buyers) WHERE {
  GRAPH ?g { ?product a schema:Product ; schema:name ?name ; schema:offers ?offer . ?offer schema:price ?price }
  OPTIONAL { GRAPH ?h { ?order a schema:Order ; schema:customer ?customer ; schema:orderedItem ?li . ?li schema:orderedItem ?product } }
} GROUP BY ?product ?name ?price ORDER BY DESC(xsd:decimal(?price)) LIMIT 1`);
if (!top) throw new Error('no priced product');
const PRODUCT = top.name, PRICE = Number(top.price).toFixed(2), BUYERS = top.buyers;
const PAGE = top.product.replace(/#.*$/, '');
console.log(`dearest: ${PRODUCT} $${PRICE}, ${BUYERS} buyers — ${PAGE}`);

const cleared = await clearBlocks({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, url: PAGE });
console.log(`cleanup: blocks stripped from ${PAGE}: ${cleared.ok ? 'ok' : cleared.out}`);

await runScene({
  id: '10-the-dearest-thing',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    async function backTo(target, tabLabel) {
      const home = async () => { const at = await activeDocument(page); return !!at && at.startsWith(target); };
      await goToTab(page, cursor, tabLabel);
      await sleep(700);
      if (await home()) return true;
      for (let i = 0; i < 4 && !(await home()); i++) { await page.goBack({ waitUntil: 'load' }).catch(() => {}); await sleep(750); }
      return home();
    }

    // ── the photographs, already painted ────────────────────────────────────
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')].filter((i) => i.complete && i.naturalWidth > 0).length >= 8,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('grid', 'eight categories, photographed');
    await sleep(2200);

    // ── one tile → its products ─────────────────────────────────────────────
    // A card is one link: photograph, title (.ti) and description together.
    const tile = page.locator('.ldh-pane.is-active .ldh-grid-block a.card').filter({ has: page.locator('.ti', { hasText: new RegExp(`^\\s*${CATEGORY}\\s*$`) }) }).first();
    if (!(await tile.count())) throw new Error(`no ${CATEGORY} tile`);
    await cursor.click(tile);
    await page.waitForLoadState('load').catch(() => {});
    const list = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Products in this category' }).first();
    await list.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    await sleep(2200);
    const n = (await list.locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    await marks.beat('category', `${CATEGORY} — its ${n} products, listed on its own page`);
    await sleep(1600);

    // ── twelve prices, one of them ten times the rest ───────────────────────
    // The table's headers are labels, not controls (FINDINGS.md #12), so the row is
    // found by reading the Price column — which is what a person does with twelve rows.
    const rows = list.locator('table tbody tr');
    const dear = rows.filter({ hasText: PRODUCT }).first();
    if (!(await dear.count())) throw new Error(`${PRODUCT} is not in the list`);
    await dear.scrollIntoViewIfNeeded();
    const priceCell = dear.locator('td').filter({ hasText: new RegExp(`^\\s*${PRICE.replace('.', '\\.')}\\s*$`) }).first();
    await cursor.moveTo(...Object.values(await priceCell.boundingBox().then((b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 }))), { duration: 700 });
    await marks.beat('dearest', `${PRODUCT} — $${PRICE}; the next dearest beverage is a fraction of it`);
    await sleep(2200);

    // ── the product's own page: price, supplier, orders — and nothing about the wine ──
    const row = dear.locator('a').filter({ hasText: PRODUCT }).first();
    await cursor.click(row);
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 25_000 }).catch(() => {});
    await sleep(3000);
    await marks.beat('bare', `${PRODUCT} — ${BUYERS} buyers, and a page that says the price and the supplier`);
    await sleep(2600);

    // ── say why, before the work ────────────────────────────────────────────
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p1 = await addProse(page, cursor, type,
      `${PRODUCT} is the dearest thing in the catalogue at $${PRICE} a bottle, and ${BUYERS} customers buy it. The page carries its price, its supplier and its orders, and nothing about the wine. What follows is what is published about it: the thesaurus's concept, and a video from its appellation.`);
    await marks.beat('question', p1.ok ? 'the gap, written on the page itself' : p1.why);
    await sleep(3200);

    // ── the concept, from another dataspace, through the proxy ──────────────
    const apps = page.locator('button.btn-apps').first();
    if (!(await apps.count())) throw new Error('no applications menu');
    await cursor.click(apps);
    await sleep(550);
    const unesco = page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first();
    if (!(await unesco.count())) throw new Error('no UNESCO entry in the applications menu');
    await cursor.click(unesco);
    await page.waitForLoadState('load').catch(() => {});
    await sleep(2700);
    await marks.beat('thesaurus', `a published vocabulary, rendered here: ${page.url().includes('uri=') ? 'through the proxy' : 'directly'}`);
    await sleep(700);
    const found = await searchGo(page, cursor, CONCEPT, { type: 'Concept' });
    await marks.beat('search', found.ok ? `${found.total} matches for ${CONCEPT} — the thesaurus's own concept` : found.why);
    if (!found.ok) throw new Error(found.why);
    await sleep(1800);

    const home = await backTo(PAGE, PRODUCT);
    await sleep(550);
    await marks.beat('return', home ? `back to ${PRODUCT}, in Content` : `lost — still on ${await activeDocument(page)}`);
    if (!home) throw new Error(`refusing to write: the active pane is ${await activeDocument(page)}, not ${PAGE}`);
    const o1 = await addObject(page, cursor, type, null, { label: CONCEPT, kind: 'Concept', mode: 'Properties' });
    await marks.beat('embed-concept', o1.ok ? 'the concept, embedded on the product page' : o1.why);
    await sleep(1400);

    // ── the video: a link pasted in, dereferenced into a resource ───────────
    const o2 = await addObject(page, cursor, type, VIDEO, { settle: 6000 });
    await marks.beat('embed-video', o2.ok ? 'a YouTube link, typed in — and rendered as a resource: the video, its channel, its thumbnail' : o2.why);
    await sleep(2600);

    const p2 = await addProse(page, cursor, type,
      `Two things this page did not have: the concept, from a thesaurus in another dataspace, and a video from the Blaye appellation, fetched from a pasted link. Both are resources on the page, and both stay linked to where they came from.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 6000 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
