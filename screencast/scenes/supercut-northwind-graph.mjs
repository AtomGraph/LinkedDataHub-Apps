// Supercut takes on Northwind, the graph run: a node blooms across a document
// boundary (1), a node opens its record (1b), and the record's own view walks the graph
// the other way — Related results hops from the customer's orders to the people who
// took them to the territories those people cover (1d), one territory opened (1e), and
// the breadcrumb up to Sales territories (1f), so the cut that follows on that page is
// a place the viewer arrived at. Recorded on a 2880×1800 viewport at zoom 1 — the
// canvas fills the pane, so the graph is native-sharp without the document zoom the
// other takes use (its hit-testing works in unzoomed pixels).
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { foreignNode, expand, select, zoomToFit, approach } from '../lib/graph.mjs';
import { deleteByTitle } from '../lib/fixture.mjs';
import { GEOMETRY_2X, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
// The rep hired for Rockville on camera (4). The previous take's hire goes off camera
// first, so the grid reads one face before and two after, every time.
const HIRE = 'Dana Whitfield';
const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: HIRE });
if (gone.removed?.length) console.log(`  reset: removed ${gone.removed.length} × ${HIRE}`);
// a delete that fails leaves last take's hire in the grid, and the count reads wrong on camera
if (gone.failed?.length) throw new Error(`reset: could not remove ${gone.failed.length} × ${HIRE} — is the ldh CLI on PATH (or LDH_BIN set)?`);
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;

await runScene({
  id: 'supercut-northwind-graph', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await load(page, OPENS_ON, 'canvas', 3000);
    await zoomToFit(page, cursor);
    await sleep(2500);
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    if (!node || node.error) throw new Error(node?.error ?? 'no customer node');
    const at = await approach(page, cursor, node.id, { fallback: node });
    const around = (p, r) => ({ focus: { x: Math.round(p.x - r), y: Math.round(p.y - r * 0.625), w: r * 2, h: Math.round(r * 1.25) } });
    await marks.beat('1-start', 'the pointer on the customer node', around(at, 520));
    const r = await expand(page, cursor, node, { settle: 3500 });
    const at2 = await approach(page, cursor, node.id, { fallback: at });
    await marks.beat('1-end', r.ok ? `+${r.gained} nodes from the customer's own document` : r.why ?? 'no bloom', around(at2, 760));
    await sleep(700);

    await zoomToFit(page, cursor);
    await sleep(1500);
    const picked = await select(page, cursor, { ...node });
    if (!picked.ok) throw new Error(picked.why);
    const panel = page.locator('[id^="info-content-"]').first();
    await marks.beat('1b-start', 'the node selected; its link in the panel', await focus(panel));
    const before = page.url().split('?')[0];
    if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 500, settle: 150, after: 200 }); else await picked.link.click();
    await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 20_000 }).catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('1b-end', `the record: ${page.url().replace(base, '')}`);
    await sleep(600);

    // ── 1d · Related results: the orders' brokers, then the brokers' territories ──
    // The pivot bar is a closed <details>: its summary is the "Related results" line,
    // and each pill re-centres the view on the related resources in place.
    const view = () => page.locator('.ldh-pane.is-active .ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Orders from this customer' }).first();
    const count = async () => (await view().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    const bar = view().locator('details.ldh-pivot-bar').first();
    if (!(await bar.count())) throw new Error('no Related results bar on the orders view');
    const summary = bar.locator('summary').first();
    await summary.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(summary)), { duration: 600 });
    await marks.beat('1d-start', `${await count()} orders; pointer on Related results`, await focus(view()));
    if (!(await bar.evaluate((d) => d.open))) { await cursor.click(summary); await sleep(900); }
    const ROUTE = [{ pill: /Sales rep/, what: 'the reps who took them' }, { pill: /Territory/, what: 'the territories they cover' }];
    for (const [i, hop] of ROUTE.entries()) {
      if (!(await bar.evaluate((d) => d.open).catch(() => false))) { await cursor.click(summary); await sleep(900); }
      const pills = view().locator('.ldh-pivot-pill:visible');
      const pill = pills.filter({ hasText: hop.pill }).first();
      if (!(await pill.count())) throw new Error(`hop ${i + 1}: no ${hop.pill} pill among ${JSON.stringify((await pills.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()))}`);
      await pill.scrollIntoViewIfNeeded();
      const before = await count();
      await cursor.moveTo(...(await centre(pill)), { duration: 500 });
      await marks.beat(`1d-hop${i + 1}-start`, `pointer on the ${(await pill.textContent()).replace(/\s+/g, ' ').trim()} pill`, await focus(view()));
      await pill.click();
      await page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .count b'); return c && c.textContent.trim() !== b; }, before, { timeout: 20_000 }).catch(() => {});
      await sleep(1500);
      await marks.beat(`1d-hop${i + 1}-end`, `${await count()} — ${hop.what}`, await focus(view()));
      await sleep(600);
    }

    // ── 1e · one territory, opened from the rows ──
    const rowLink = view().locator('table tbody tr').first().locator('a').first();
    await rowLink.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(rowLink)), { duration: 500 });
    await marks.beat('1e-start', `pointer on ${(await rowLink.textContent()).trim()}`, await focus(view()));
    const beforeUrl = page.url().split('?')[0];
    await rowLink.click();
    await page.waitForFunction((b) => location.href.split('?')[0] !== b, beforeUrl, { timeout: 20_000 }).catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('1e-end', `the territory: ${page.url().replace(base, '')}`);
    await sleep(600);

    // ── 4 · a rep hired for the territory: Create on "Employees serving this territory",
    //        the Person form the ontology wrote, Save, the grid one face richer ──
    const emps = () => page.locator('.ldh-pane.is-active .ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Employees serving this territory' }).first();
    const empCount = async () => (await emps().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();
    const cbtn = emps().locator('button.add-instance').first();
    await cbtn.waitFor({ state: 'visible', timeout: 15_000 });
    await cbtn.scrollIntoViewIfNeeded();
    const before4 = await empCount();
    await cursor.moveTo(...(await centre(cbtn)), { duration: 600 });
    await marks.beat('4-start', `${before4} serving Rockville; pointer on Create`, await focus(emps()));
    await cursor.click(cbtn);
    const modal = page.locator('.modal-constructor:visible, .ac-modal:visible').last();
    await modal.waitFor({ state: 'visible', timeout: 15_000 });
    await modal.locator('.ldh-prop-group').nth(3).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await sleep(1000);
    const labels = async () => (await modal.locator('.ldh-prop-group').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 24));
    await marks.beat('4-form', `the Person form the ontology wrote: ${JSON.stringify(await labels())}`, await focus(modal));
    // fields by label, never by position; a label the form lacks is skipped
    for (const [re, val] of [['^Title', HIRE], ['^Name', HIRE], ['Given name', 'Dana'], ['Family name', 'Whitfield'], ['Job title', 'Sales Representative'], ['^Description', 'Dana joins from a Maryland distributor and takes over the Rockville accounts.'], ['^Identifier', String(Date.now()).slice(-4)]]) {
      const groups = modal.locator('.ldh-prop-group'); const c = await groups.count();
      for (let i = 0; i < c; i++) {
        const g = groups.nth(i); const label = ((await g.textContent()) ?? '').replace(/\s+/g, ' ').trim();
        if (!new RegExp(re, 'i').test(label)) continue;
        const input = g.locator('input:not([type=hidden]):visible, textarea:visible').first();
        if (!(await input.count()) || await input.inputValue()) continue;
        await cursor.click(input); await input.pressSequentially(val, { delay: 35 }); break;
      }
    }
    const save4 = modal.locator('button').filter({ hasText: /Save|Create|check/ }).last();
    await save4.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(save4)), { duration: 500 });
    await marks.beat('4-filled', 'the form filled; pointer on Save', await focus(modal));
    await cursor.click(save4);
    await page.waitForFunction(() => ![...document.querySelectorAll('.modal-constructor, .ac-modal')].some((m) => m.offsetParent !== null), null, { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('load').catch(() => {});
    await sleep(800);
    await marks.beat('4-saved', 'saved');
    const moved = await page.waitForFunction((sel, b) => { const c = document.querySelector(sel); return c && c.textContent.trim() !== b; }, ['.ldh-pane.is-active .ldh-view-toolbar .count b', before4], { timeout: 8000 }).then(() => true, () => false).catch(() => false);
    await sleep(1200);
    await marks.beat('4-end', `${await empCount()} serving Rockville (was ${before4}, refreshed itself: ${moved})`, await focus(emps()));
    await sleep(1500);

    // ── 1f · up the breadcrumb to Sales territories ──
    const crumb = page.locator('[role="navigation"] a.bc-pill').filter({ hasText: /territories\s*$/i }).first();
    if (!(await crumb.count())) throw new Error('no territories breadcrumb on the territory page');
    await cursor.moveTo(...(await centre(crumb)), { duration: 500 });
    await marks.beat('1f-start', `pointer on the ${(await crumb.textContent()).replace(/\s+/g, ' ').trim()} breadcrumb`);
    const beforeCrumb = page.url().split('?')[0];
    await cursor.click(crumb);
    await page.waitForFunction((b) => location.href.split('?')[0] !== b, beforeCrumb, { timeout: 20_000 }).catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ol-viewport', { timeout: 30_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('1f-end', `Sales territories: ${page.url().replace(base, '')}`);
    await sleep(800);
    await marks.beat('end');
  },
});
