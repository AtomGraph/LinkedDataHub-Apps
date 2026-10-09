// Flow A of the overview, the graph half, at 1×: an order in Graph mode, a node expanded
// across a document boundary and that node opened (A3); then, on the opened document,
// a view's Related results pivoting to a related class (A4). The route is the supercut
// graph take's — the customer node of order 10423, the customer's orders, the reps who
// took them — because it is the one that reads on camera. Recorded on a 2880×1800
// viewport at zoom 1, so the canvas is native-sharp; the cutter pushes into each beat's
// focus box for the chrome.
//
// Read-only: nothing is written.
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { foreignNode, expand, select, zoomToFit, approach } from '../lib/graph.mjs';
import { revealControls } from '../lib/blocks.mjs';
import { GEOMETRY_2X, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;

await runScene({
  id: 'overview-a-graph', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await load(page, OPENS_ON, 'canvas', 3000);
    await zoomToFit(page, cursor);
    await sleep(2500);

    // ── A3 · a node expanded across a document boundary, then opened ───────────
    const node = await foreignNode(page, `${base}/orders/${ORDER}/`, { skip: 0, prefer: /\/customers\// });
    if (!node || node.error) throw new Error(`A3: ${node?.error ?? 'no customer node'}`);
    const at = await approach(page, cursor, node.id, { fallback: node });
    const around = (p, r) => ({ focus: { x: Math.round(p.x - r), y: Math.round(p.y - r * 0.625), w: r * 2, h: Math.round(r * 1.25) } });
    await marks.beat('A3-start', 'the order as a graph; pointer on the customer node', around(at, 520));
    const grown = await expand(page, cursor, node, { settle: 3500 });
    const at2 = await approach(page, cursor, node.id, { fallback: at });
    await marks.step('A3-grown', grown, (x) => `+${x.gained} nodes from the customer's own document`, around(at2, 760));
    await sleep(700);
    await zoomToFit(page, cursor);
    await sleep(1500);
    const picked = await select(page, cursor, { ...node });
    if (!picked.ok) throw new Error(`A3: ${picked.why}`);
    const panel = page.locator('[id^="info-content-"]').first();
    await marks.beat('A3-selected', 'the node selected; its link in the panel', await focus(panel));
    const before = page.url().split('?')[0];
    if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 500, settle: 150, after: 200 }); else await picked.link.click();
    await until(page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 20_000 }), 'the customer\'s record');
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'the customer\'s record, rendered');
    await sleep(2000);
    await marks.beat('A3-end', `opened: ${page.url().replace(base, '')}`);
    await sleep(600);

    // ── A4 · Related results: the orders' brokers ──────────────────────────────
    const view = () => page.locator('.ldh-pane.is-active .ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Orders from this customer' }).first();
    const count = async () => (await view().locator('.count b').first().textContent({ timeout: 4000 })).trim();
    const toggle = view().locator('.ldh-block-head button.tb-controls').first();
    if (!(await toggle.count())) throw new Error('A4: no controls toggle on the orders view');
    await toggle.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(toggle)), { duration: 600 });
    await marks.beat('A4-start', `${await count()} orders; pointer on the controls toggle`, await focus(view()));
    const shown = await revealControls(page, cursor, view());
    if (!shown.ok) throw new Error(shown.why ?? 'A4: the controls did not open');
    const bar = view().locator('.ldh-pivot-bar').first();
    if (!(await bar.count())) throw new Error('A4: no Related results bar on the orders view');
    await marks.beat('A4-open', 'the toolbar: facets, sort, and Related results, opened', await focus(view()));
    // A facet first: the order-status pill opens its values with their counts, and the
    // delivered orders are picked, so the view filters before it pivots.
    const facet = view().locator('.ldh-view-toolbar .facet-pill').filter({ hasText: /status/i }).first();
    if (!(await facet.count())) throw new Error('A4: no Order status facet on the orders view');
    await cursor.moveTo(...(await centre(facet)), { duration: 500 });
    await marks.beat('A4-facet', 'pointer on the Order status facet', await focus(view()));
    await cursor.click(facet);
    const pop = page.locator('.facet-pop:visible').first();
    await until(pop.waitFor({ state: 'visible', timeout: 15_000 }), 'the facet\'s values');
    await until(pop.locator('button.opt').first().waitFor({ state: 'visible', timeout: 20_000 }), 'the facet\'s value counts');
    await sleep(1500);
    await marks.beat('A4-values', 'the status values, each with its count', await focus(view(), pop));
    const opt = pop.locator('button.opt').filter({ hasText: /Delivered/ }).first();
    const chosen = (await opt.count()) ? opt : pop.locator('button.opt').first();
    const was0 = await count();
    await cursor.click(chosen);
    await until(page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .count b'); return c && c.textContent.trim() !== b; }, was0, { timeout: 20_000 }), 'the filtered results');
    await sleep(1500);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
    await marks.beat('A4-filtered', `${await count()} of ${was0}: the delivered orders`, await focus(view()));
    const pill = view().locator('.ldh-pivot-pill:visible').filter({ hasText: /Sales rep/ }).first();
    if (!(await pill.count())) throw new Error('A4: no Sales rep pill');
    await pill.scrollIntoViewIfNeeded();
    const was = await count();
    await cursor.moveTo(...(await centre(pill)), { duration: 500 });
    await marks.beat('A4-pill', 'pointer on the Sales rep pill', await focus(view()));
    await pill.click();
    await until(page.waitForFunction((b) => { const c = document.querySelector('.ldh-pane.is-active .count b'); return c && c.textContent.trim() !== b; }, was, { timeout: 20_000 }), 'the related results');
    await sleep(2000);
    await marks.beat('A4-end', `${await count()} — the reps who took them`, await focus(view()));
    await sleep(800);
    await marks.beat('end');
  },
});
