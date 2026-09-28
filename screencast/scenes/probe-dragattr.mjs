// Read-only: is the block drag handle natively draggable, and what is the row order now.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const [pg] = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "Where we have nobody" } } LIMIT 1`);
await runScene({ id: 'probe-dragattr', target: pg.doc, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(pg.doc + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ContentMode'), { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active span.ldh-bh-drag', { state: 'attached', timeout: 25_000 }); await sleep(4000); const first = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ has: page.locator('span.ldh-bh-drag') }).first(); await first.hover(); await sleep(600); console.log('  handle after hover:', JSON.stringify(await first.locator('span.ldh-bh-drag').first().evaluate((h) => ({ draggable: h.getAttribute('draggable'), display: getComputedStyle(h).display, visibility: getComputedStyle(h).visibility, box: h.getBoundingClientRect().width }))));
    console.log('  rows:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')].filter((r) => r.querySelector('span.ldh-bh-drag')).map((r) => ({ about: r.getAttribute('about')?.slice(-10), handleDraggable: r.querySelector('span.ldh-bh-drag').getAttribute('draggable'), handleParentDraggable: r.querySelector('span.ldh-bh-drag').closest('[draggable]')?.tagName, kind: r.querySelector('.ol-viewport') ? 'map' : r.querySelector('p') ? 'prose' : 'other', top: Math.round(r.getBoundingClientRect().top) })))));
  } });
