// Read-only: the chart pane's selects, and where the map block sits on the nobody page.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const q = async (t) => (await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "${t}" } } LIMIT 1`))[0].doc;
const south = await q('One rep for the South'), nobody = await q('Where we have nobody');
await runScene({ id: 'probe-chartsel', target: south, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(south + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode'), { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block-row', { timeout: 25_000 }); await sleep(5000);
    const row = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Reps per region' }).first();
    console.log('  selects:', JSON.stringify(await row.locator('select').evaluateAll((ss) => ss.map((s) => ({ name: s.name, cls: s.className, value: s.value, selected: s.options[s.selectedIndex]?.textContent.trim(), options: [...s.options].map((o) => o.textContent.trim()).slice(0, 8) })))));
    await page.goto(nobody + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ContentMode'), { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .content-body > .ldh-block-row', { timeout: 25_000 }); await sleep(5000);
    console.log('  rows:', JSON.stringify(await page.locator('.ldh-pane.is-active .content-body > .ldh-block-row').evaluateAll((rs) => rs.map((r, i) => ({ i, map: !!r.querySelector('.ol-viewport'), handle: !!r.querySelector('span.ldh-bh-drag'), about: r.querySelector('[about]')?.getAttribute('about')?.slice(-12), text: r.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) })))));
  } });
