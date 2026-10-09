// Flow A of the overview, the 2× half: the drawer opens on the document tree and a
// container is opened from it (A1); the container's child listing is cycled through its
// layout modes (A2); and the search dialog finds a resource by its label (A5). The graph
// shots between them, A3 and A4, are overview-a-graph.mjs, recorded at 1× because the
// canvas is only sharp unzoomed; the cut interleaves the two takes by their beats.
//
// Read-only: nothing is written. Dark, 2×, the pointer at a person's pace. Every shot
// in the script has a <id>-start and <id>-end beat, each with the focus box of what the
// gesture lands on, so the cutter can place the narration line at the start beat and
// hold the shot to the end one.
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { openTree, treeGo, searchGo } from '../lib/nav.mjs';
import { switchViewMode, currentViewMode } from '../lib/modes.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTop } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/`;
const CONTAINER = 'Territories';

await runScene({
  id: 'overview-a-browse', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await load(page, OPENS_ON, '.ldh-pane.is-active .ldh-block', 3000);

    // ── A1 · the tree, and a container opened from it ───────────────────────────
    await cursor.moveTo(900, 900, { duration: 400 });
    await sleep(1500);
    await marks.beat('A1-start', 'the dashboard; pointer heading for the left edge');
    // The warmed page can still be re-rendering client-side when the edge is reached, which
    // destroys the wait's execution context and reports the drawer as not opened. Ask again.
    let opened = false;
    for (let i = 0; i < 3 && !opened; i++) opened = await openTree(page, cursor);
    if (!opened) throw new Error('A1: the drawer did not open');
    await sleep(1200);
    const drawer = ui(page).locator('.left-sidebar, .ldh-sidebar').first();
    await marks.beat('A1-tree', 'the document tree, open', await focus(drawer));
    // The tree opens on Root alone; its containers show once Root is expanded.
    const expander = drawer.locator('button.btn-expand-tree').first();
    const linksBefore = await ui(page).locator('.tree-link').count();
    await cursor.click(expander);
    await until(page.waitForFunction((n) => document.querySelectorAll('.ldh-pane.is-active .tree-link').length > n, linksBefore, { timeout: 20_000 }), 'the root\'s children in the tree');
    await sleep(1500);
    await marks.beat('A1-expanded', `${await ui(page).locator('.tree-link').count()} entries`, await focus(drawer));
    const went = await treeGo(page, cursor, CONTAINER);
    if (!went.ok) throw new Error(`A1: ${went.why}`);
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar, .ldh-pane.is-active .ldh-block', { timeout: 30_000 }), `the ${CONTAINER} container`);
    await until(page.waitForSelector('.ldh-pane.is-active .ol-viewport', { timeout: 30_000 }), 'the territories map');
    await sleep(2500);
    await marks.beat('A1-end', `${CONTAINER}: ${page.url().replace(base, '')}`);
    await sleep(600);

    // ── A2 · the child listing, in every layout mode ────────────────────────────
    const view = () => ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    await marks.beat('A2-start', `the listing as ${await currentViewMode(page) ?? 'its default'}`, await focus(view()));
    for (const mode of ['list-mode', 'table-mode', 'grid-mode', 'map-mode']) {
      const r = await switchViewMode(page, cursor, mode, { settle: 2600 });
      if (r === false) throw new Error(`A2: ${mode} is not on offer`);
      await marks.beat(`A2-${mode.replace('-mode', '')}`, `the listing as ${mode}`, await focus(view()));
    }
    await until(page.waitForSelector('.ldh-pane.is-active .ol-viewport', { timeout: 30_000 }), 'the map again');
    await sleep(1500);
    await marks.beat('A2-end', 'back on the map', await focus(view()));
    await sleep(600);

    // ── A5 · search by label ───────────────────────────────────────────────────
    await easeScrollTop(page, { ms: 1200 }); await sleep(400);
    await marks.beat('A5-start', 'pointer to the drawer, for search');
    const found = await searchGo(page, cursor, 'Seattle', { match: 'Seattle' });
    if (!found.ok) throw new Error(`A5: ${found.why}`);
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'the found document');
    await sleep(2000);
    await marks.beat('A5-end', `found: ${found.label.split('\n')[0]} (${found.total} results) → ${page.url().replace(base, '')}`);
    await sleep(800);

    // ── A6 · any URL in the address bar: a web page's JSON-LD, read as data ──────
    const FILM = 'https://www.rottentomatoes.com/m/star_wars_episode_iv_a_new_hope';
    const box = page.locator('form.ldh-address input[name="uri"]').first();
    await cursor.click(box);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await sleep(300);
    // framed on the bar: the line says the URL goes there, so the cut has to keep it in view
    await marks.beat('A6-start', 'the address bar, cleared', await focus(box));
    await box.pressSequentially(FILM, { delay: 18 });
    await sleep(600);
    await marks.beat('A6-typed', 'a film\'s page on a review site, typed', await focus(box));
    await page.keyboard.press('Enter');
    await until(page.waitForFunction(() => /Star Wars/.test(document.querySelector('.ldh-pane.is-active')?.innerText ?? ''), null, { timeout: 60_000 }), 'the film, rendered through the proxy');
    await sleep(3500);
    const film = () => ui(page).locator('.ldh-block').first();
    await marks.beat('A6-rendered', 'the film as a resource: a Movie, with its people as links', await focus(film()));
    const actor = ui(page).locator('.ldh-block a').filter({ hasText: /harrison ford/i }).first();
    if (!(await actor.count())) throw new Error('A6: no actor link on the film');
    await actor.scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(actor)), { duration: 600 });
    await marks.beat('A6-link', 'pointer on an actor\'s link', await focus(film()));
    await cursor.click(actor);
    await until(page.waitForFunction(() => /Harrison Ford/.test(document.querySelector('.ldh-pane.is-active')?.innerText ?? '') && /Person/.test(document.querySelector('.ldh-pane.is-active')?.innerText ?? ''), null, { timeout: 60_000 }), 'the actor, rendered through the proxy');
    await sleep(3000);
    await marks.beat('A6-end', 'the actor: a Person, read from another page of the same site', await focus(ui(page).locator('.ldh-block').first()));
    await sleep(800);
    await marks.beat('end');
  },
});
