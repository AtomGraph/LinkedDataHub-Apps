// Read-only (no data written): the Employees view switched to Graph mode, a bloom in
// it, then the Territory and Region pivots — which mode do they render in, and can the
// Southern node be selected and its link found.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { switchViewMode, currentViewMode } from '../lib/modes.mjs';
import { graphState, foreignNode, expand, select, zoomToFit, nodeById } from '../lib/graph.mjs';
import { GEOMETRY_2X, load } from '../lib/supercut.mjs';
const opts = await resolve('/employees/');
const { base } = opts;
const info = (page) => page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].filter((b) => b.querySelector('.ldh-view-toolbar')).slice(0, 1).map((v) => ({ count: v.querySelector('.ldh-view-toolbar .count')?.textContent.trim(), mode: v.querySelector('.ldh-view-toolbar .right .ldh-mode button.drop-toggle')?.textContent.replace(/expand_more/g, '').trim(), canvas: !!v.querySelector('canvas'), pills: [...v.querySelectorAll('.ldh-pivot-pill')].map((p) => p.textContent.trim().replace(/\s+/g, ' ').replace('arrow_forward', '→').replace('arrow_back', '←')) })));
await runScene({ id: 'probe-nw-graphview', target: opts.target, identity: opts.identity, geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor }) {
    await load(page, opts.target, '.ldh-pane.is-active .ldh-view-toolbar', 3000);
    console.log('  mode before:', await currentViewMode(page));
    const sw = await switchViewMode(page, cursor, 'graph-mode', { settle: 6000 });
    console.log('  switch:', sw, JSON.stringify(await info(page)));
    await zoomToFit(page, cursor).catch(() => {}); await sleep(2000);
    console.log('  graph:', JSON.stringify(await graphState(page)));
    await page.screenshot({ path: process.env.SHOTS + '/nwg-0.png' });
    const node = await foreignNode(page, `${base}/employees/`, { prefer: /\/employees\/\d+\/#this/ });
    console.log('  employee node:', JSON.stringify(node).slice(0, 200));
    if (node && !node.error) { const r = await expand(page, cursor, node, { settle: 5000 }); console.log('  expand:', JSON.stringify(r)); await page.screenshot({ path: process.env.SHOTS + '/nwg-1.png' }); }
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    const bar = view.locator('details.ldh-pivot-bar').first();
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await bar.locator('summary').first().click(); await sleep(600); }
    await view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Territory' }).first().click(); await sleep(6000);
    console.log('  after Territory:', JSON.stringify(await info(page)), JSON.stringify(await graphState(page)));
    await page.screenshot({ path: process.env.SHOTS + '/nwg-2.png' });
    const b2 = ui(page).locator('.ldh-pane.is-active details.ldh-pivot-bar').first();
    if (await b2.count() && !(await b2.evaluate((d) => d.open))) { await b2.locator('summary').first().click(); await sleep(600); }
    await ui(page).locator('.ldh-pivot-pill:visible').filter({ hasText: 'Region' }).first().click(); await sleep(6000);
    console.log('  after Region:', JSON.stringify(await info(page)), JSON.stringify(await graphState(page)));
    await page.screenshot({ path: process.env.SHOTS + '/nwg-3.png' });
    const s = await nodeById(page, `${base}/regions/4/#this`);
    console.log('  southern node:', JSON.stringify(s).slice(0, 200));
    if (s && !s.error) { const picked = await select(page, cursor, { ...s }); console.log('  select:', JSON.stringify(picked).slice(0, 200)); await page.screenshot({ path: process.env.SHOTS + '/nwg-4.png' }); }
  } });
