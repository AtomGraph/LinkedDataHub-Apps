// One flow on Rebrickable, three shots: a node in a printed brick's graph opens the
// base brick's page (1b); the page glides down to its Colors view — the same brick
// photographed in 78 colours (v); the Color pivot pill turns the results into the
// colours themselves (p). The graph part runs at zoom 1 (canvas hit-testing works in
// unzoomed pixels); the record page loads at 2× like the other takes.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { foreignNode, select, zoomToFit, expand, approach } from '../lib/graph.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/parts/3001pr0045/');
const { base, identity } = opts;
const G = `${opts.target}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
const count = (scope) => scope.locator('.ldh-view-toolbar .count b').first().textContent().then((t) => t.trim()).catch(() => '');

await runScene({
  id: 'supercut-rebrickable-flow', target: G, warm: G, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await load(page, G, 'canvas', 4000, { timeout: 120_000 });
    // the graph registers itself after the canvas appears; on this heavy page that
    // can take a while — wait for a live instance with nodes before touching it
    await page.waitForFunction(() => { const gs = window.LinkedDataHub?.graphs ?? {}; return Object.values(gs).some((g) => { try { return (g.instance ?? g).graphData().nodes.length > 0; } catch { return false; } }); }, null, { timeout: 90_000 }).catch(() => console.log('  graph instance not seen in 90 s'));
    await zoomToFit(page, cursor); await sleep(2500);
    // ── 1 · the base brick's node blooms with its own document: 78 colours ──────
    const node = await foreignNode(page, opts.target, { prefer: /\/parts\/3001\/#this/ });
    if (!node || node.error) throw new Error(node?.error ?? 'no base brick node');
    const at = await approach(page, cursor, node.id, { fallback: node });
    const around = (p, r) => ({ focus: { x: Math.round(p.x - r), y: Math.round(p.y - r * 0.625), w: r * 2, h: Math.round(r * 1.25) } });
    await marks.beat('1-start', 'eleven nodes; the pointer on the base brick', around(at, 520));
    const r = await expand(page, cursor, node, { settle: 6000 });
    const at2 = await approach(page, cursor, node.id, { fallback: at });
    await marks.beat('1-end', r.ok ? `+${r.gained} nodes from the brick's own document` : r.why ?? 'no bloom', around(at2, 900));
    await sleep(700);
    await zoomToFit(page, cursor);
    await sleep(1500);
    // ── 1b · the node, now described, opens its page ───────────────────────────
    const picked = await select(page, cursor, { ...node });
    if (!picked.ok) throw new Error(picked.why);
    const panel = page.locator('[id^="info-content-"]').first();
    await marks.beat('1b-start', 'the brick node selected; its link in the panel', await focus(panel));
    await zoom2x(page); // the page it opens loads at 2×
    const before = page.url().split('?')[0];
    if (picked.point) await cursor.clickAt(picked.point.x, picked.point.y, { duration: 500, settle: 150, after: 200 }); else await picked.link.click();
    await page.waitForFunction((b) => location.href.split('?')[0] !== b, before, { timeout: 60_000 }).catch(() => {});
    await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 120_000 }).catch(() => {});
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Colors' }).last();
    await view.locator('img').first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
    await sleep(1500);
    await marks.beat('1b-end', `the record: ${page.url().replace(base, '')}`);
    // ── v · down the page to the Colors view ───────────────────────────────────
    await sleep(600);
    await easeScrollTo(view, { ms: 2200, margin: 40 });
    await sleep(800);
    await marks.beat('v-end', 'the Colors view: one brick, 78 colours', await focus(view));
    // ── p · the Color pivot ────────────────────────────────────────────────────
    const bar = view.locator('details.ldh-pivot-bar').first();
    const before78 = await count(view);
    await marks.beat('p-start', `${before78} colours; pointer to the pivot bar`, await focus(view));
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await cursor.click(bar.locator('summary').first()); await sleep(900); }
    const pill = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Color' }).first();
    if (!(await pill.count())) throw new Error('no Color pivot pill');
    await cursor.moveTo(...(await centre(pill)), { duration: 700 }); await sleep(300);
    const pillAt = await centre(pill);
    const snapshot = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-view-toolbar .count')].map((c) => c.textContent.trim()).join('|'));
    await cursor.click(pill);
    // the pivot renders its results as a new view (a new toolbar, a new count) — the
    // old view's count stays — so wait for the set of counts to change
    await page.waitForFunction((b) => [...document.querySelectorAll('.ldh-pane.is-active .ldh-view-toolbar .count')].map((c) => c.textContent.trim()).join('|') !== b, snapshot, { timeout: 30_000 }).catch(() => {});
    await sleep(2200);
    // the results now under the pointer's column: the block below the pill
    const resBox = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y + 260)?.closest('.ldh-block'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, { x: pillAt[0], y: pillAt[1] }).catch(() => null);
    await marks.beat('p-end', 'the colours themselves', resBox ? { focus: resBox } : await focus(view));
    await sleep(3000);
    await marks.beat('end');
  },
});
