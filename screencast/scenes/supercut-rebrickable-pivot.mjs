// One gesture on Rebrickable: the 2×4 brick's Colors view — the same brick photographed
// in 78 colours — then its Color pivot pill, and the results become the colours
// themselves. Dark, 2×, the view framed whole; the result lingers.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/parts/3001/');
const { identity } = opts;
const count = (scope) => scope.locator('.ldh-view-toolbar .count b').first().textContent().then((t) => t.trim()).catch(() => '');

await runScene({
  id: 'supercut-rebrickable-pivot', target: opts.target, warm: opts.target, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await load(page, opts.target, '.ldh-pane.is-active .ldh-view-toolbar', 5000);
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: 'Colors' }).last();
    await view.locator('img').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    await view.evaluate((el) => el.scrollIntoView({ block: 'start' })); await sleep(2500);
    const bar = view.locator('details.ldh-pivot-bar').first();
    const before = await count(view);
    await marks.beat('p-start', `${before} colours of one brick; pointer to the pivot bar`, await focus(view));
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await cursor.click(bar.locator('summary').first()); await sleep(900); }
    const pill = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Color' }).first();
    if (!(await pill.count())) throw new Error('no Color pivot pill');
    await cursor.moveTo(...(await centre(pill)), { duration: 700 });
    await sleep(300);
    await cursor.click(pill);
    await page.waitForFunction(() => { const c = document.querySelector('.ldh-pane.is-active .ldh-block:last-of-type .ldh-view-toolbar .count b, .ldh-pane.is-active .ldh-view-toolbar .count b'); return !!c; }, null, { timeout: 20_000 }).catch(() => {});
    await sleep(2200);
    await marks.beat('p-end', 'the colours themselves', await focus(view));
    // the recording stops at context close and loses its last second or two: pad the tail
    await sleep(3000);
    await marks.beat('end');
  },
});
