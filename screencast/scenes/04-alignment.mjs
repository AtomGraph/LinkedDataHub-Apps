// Scenario N4 — "Does our Beverages category mean what UNESCO means by it?"
//
// A vocabulary-alignment errand. The product categories are Northwind's own words;
// the UNESCO thesaurus is a published vocabulary. Reaching one from the other needs
// no export and no integration: the applications menu proxies the whole dataspace
// into this one's chrome, so a remote concept browses exactly like a local record.
//
// The page ends up carrying both sides of the alignment — our categories and the
// public concept — plus the sentence that connects them.
//
//   make scene SCENE=04-alignment BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { addProse, addObject, copyUri, switchDocumentMode } from '../lib/blocks.mjs';
import { treeGo, goToTab } from '../lib/nav.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const SLUG = 'category-alignment';
// The category we are aligning, and the concept we expect to find by that name.
const TERM = 'Beverages';

const { url } = await resetDocument({
  ldh: opts.ldh,
  base,
  certFile: opts.certFile,
  certPassword: opts.certPassword,
  certPasswordFile: opts.certPasswordFile,
  container: `${base}/`,
  slug: SLUG,
  title: 'Category alignment',
});
console.log(`fixture ready: ${url}`);

await runScene({
  id: '04-alignment',
  target: url,
  identity,
  geometry: geometryFrom(opts, { width: 1440, height: 810, deviceScaleFactor: 2 }),

  async body({ page, cursor, type, marks }) {
    // Every link is re-queried after a navigation: a locator resolved on the
    // previous page keeps matching a detached element and clicks nothing.
    const visibleLink = (text) =>
      page.locator('.ldh-block-body a:visible').filter({ hasText: text }).first();

    // Coming home from a proxied dataspace is a tab switch, not a navigation: the
    // address does not change, so anything that checks the URL is checking the
    // wrong thing. Falls back to browser back when no tab was opened.
    async function backTo(target, tabLabel) {
      const switched = await goToTab(page, cursor, tabLabel);
      if (switched.ok) return true;
      for (let i = 0; i < 4 && !page.url().startsWith(target); i++) {
        await page.goBack({ waitUntil: 'load' }).catch(() => {});
        await sleep(1700);
      }
      await sleep(1500);
      return page.url().startsWith(target);
    }

    // ── the question ────────────────────────────────────────────────────────
    await page.goto(url, { waitUntil: 'load' });
    await sleep(3500);
    await marks.beat('empty', 'a page for the alignment');
    await sleep(900);

    const inContent = await switchDocumentMode(page, cursor, 'content-mode');
    await marks.beat('content-mode', inContent ? 'switched to Content' : 'mode switcher would not open');
    await sleep(1100);

    const p1 = await addProse(page, cursor, type,
      'Beverages is our own label. Does a published vocabulary have a concept for it, and is it the same thing?');
    await marks.beat('question', p1.ok ? 'written into the page' : p1.why);
    await sleep(1200);

    // ── our side ────────────────────────────────────────────────────────────
    const wentC = await treeGo(page, cursor, 'Categories');
    await marks.beat('categories', wentC.ok ? 'our categories, via the tree' : wentC.why);

    const cBlock = page.locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    const copiedC = await copyUri(page, cursor, cBlock);
    await marks.beat('copy-ours', copiedC.ok ? (copiedC.value ?? 'copied') : copiedC.why);
    await sleep(1000);

    await backTo(url, 'Category alignment');
    const o1 = await addObject(page, cursor, type, null, { paste: true, mode: 'Grid' });
    await marks.beat('embed-ours', o1.ok ? 'our categories, embedded as a grid' : o1.why);
    await sleep(2000);

    // ── the public side, through the proxy ──────────────────────────────────
    // The applications menu does not leave this dataspace: it fetches the other one
    // through the Linked Data proxy and renders it here, so a remote vocabulary is
    // browsed with the same chrome, the same tree and the same copy control.
    const apps = page.locator('button.btn-apps').first();
    if (await apps.count()) {
      await cursor.click(apps);
      await sleep(1200);
      const unesco = page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first();
      if (await unesco.count()) {
        await cursor.click(unesco);
        await page.waitForLoadState('load').catch(() => {});
        await sleep(6000);
        await marks.beat('thesaurus', `a published vocabulary, rendered here: ${page.url().includes('uri=') ? 'through the proxy' : 'directly'}`);
        await sleep(1600);
      } else {
        await marks.beat('thesaurus', 'no UNESCO entry in the applications menu');
      }
    }

    const concepts = visibleLink('Concepts');
    if (await concepts.count()) {
      await cursor.click(concepts);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(6000);
      await marks.beat('concepts', 'the concept container');
      await sleep(1200);
    } else {
      await marks.beat('concepts', 'no Concepts container on the proxied root');
    }

    // 4489 concepts, alphabetical, and Beverages is 368 in — so it is found by
    // filtering on preferred label rather than paged to. Taking whatever sorts
    // first would put an unrelated concept in a page about our catalogue.
    const facet = page.locator('.ldh-pane.is-active .ldh-view-toolbar .left .facet button.facet-pill').first();
    if (await facet.count()) {
      await cursor.click(facet);
      await page.waitForFunction(
        () => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'),
        null, { timeout: 25_000 },
      ).catch(() => {});
      await sleep(900);
      await marks.beat('filter', `${await page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').count()} concepts to choose from`);

      const match = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt')
        .filter({ hasText: new RegExp(`^\\s*${TERM}\\s*\\d*\\s*$`) }).first();
      const option = (await match.count())
        ? match
        : page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt').filter({ hasText: TERM }).first();
      if (await option.count()) {
        await option.scrollIntoViewIfNeeded().catch(() => {});
        await cursor.click(option);
        await sleep(3200);
        await cursor.click(facet); // close the popover — Escape does not
        await sleep(900);
        await marks.beat('narrowed', `${await page.locator('.ldh-pane.is-active .ldh-view-toolbar .right .count b').first().textContent().catch(() => '?')} left`);
        await sleep(1200);
      } else {
        await marks.beat('narrowed', `no concept named ${TERM}`);
      }
    }

    const hit = page.locator('.ldh-pane.is-active .ldh-block-body a:visible').first();
    if (await hit.count()) {
      const label = (await hit.textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 36);
      await cursor.click(hit);
      await page.waitForLoadState('load').catch(() => {});
      await sleep(6000);
      await marks.beat('concept', label);
      await sleep(2500); // a proxied resource finishes rendering after load fires
    }

    const copiedU = await copyUri(page, cursor);
    await marks.beat('copy-public', copiedU.ok ? (copiedU.value ?? 'copied') : copiedU.why);
    await sleep(1200);

    // ── bring it home ───────────────────────────────────────────────────────
    const home = await backTo(url, 'Category alignment');
    // Closing the proxy tab lands back on the document, but not necessarily in the
    // mode it was left in — and without ContentMode there are no add buttons.
    // The document tab kept its Content mode while the other tab was in front, so
    // switching back needs no mode change — switchViewMode-style, do not re-assert
    // what is already true.
    await sleep(1200);
    await marks.beat('return', home ? 'back to the alignment page, in Content' : `lost: ${page.url().slice(0, 70)}`);

    const o2 = await addObject(page, cursor, type, null, { paste: true, mode: 'Properties' });
    await marks.beat('embed-public', o2.ok ? 'the public concept, embedded beside ours' : o2.why);
    await sleep(2200);

    const p2 = await addProse(page, cursor, type,
      `UNESCO's ${TERM} is the same idea as ours. It was never imported — it lives in another dataspace and is fetched on demand.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(1400);

    const scrolled = await scrollThrough(page, { duration: 6500 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(1200);

    await marks.beat('end');
    await sleep(800);
  },
});
