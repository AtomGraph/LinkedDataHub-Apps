// Supercut takes on the UNESCO thesaurus: the document tree (21) and a concept
// expanded in it (16). 2× footage; each beat carries its focus box.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { openTree } from '../lib/nav.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;

await runScene({
  id: 'supercut-unesco', target: `${base}/concepts/`, warm: `${base}/concepts/`, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    // ── 21 · the drawer opens on the tree ─────────────────────────────────────
    await load(page, `${base}/concepts/`, '.ldh-pane.is-active .ldh-block', 3000);
    await cursor.moveTo(480, 840, { duration: 300 });
    await marks.beat('21-start', 'the concepts container');
    await openTree(page, cursor);
    await sleep(900);
    const drawer = ui(page).locator('.left-sidebar, .document-tree').first();
    await marks.beat('21-end', 'the document tree', await focus(drawer));
    await sleep(800);

    // ── 16 · a concept expanded in the tree ───────────────────────────────────
    const expand = ui(page).locator('.ldh-tree button.btn-expand-tree, .ldh-tree [class*="btn-expand"]').first();
    if (!(await expand.count())) throw new Error('no expand control in the tree');
    await expand.scrollIntoViewIfNeeded();
    const rowsBefore = await ui(page).locator('.ldh-tree .tree-row').count();
    await cursor.moveTo(...(await centre(expand)), { duration: 400 });
    await marks.beat('16-start', 'pointer on a branch of the tree', await focus(drawer));
    await expand.click();
    await page.waitForFunction((n) => document.querySelectorAll('.ldh-pane.is-active .ldh-tree .tree-row').length > n, rowsBefore, { timeout: 20_000 }).catch(() => {});
    await sleep(1200);
    await marks.beat('16-end', `${await ui(page).locator('.ldh-tree .tree-row').count()} rows`, await focus(drawer));
    await sleep(800);
    await marks.beat('end');
  },
});
