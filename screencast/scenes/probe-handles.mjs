// Read-only: which block rows carry a drag handle, on which page/mode; and when the chart
// pane shows a <table> vs an svg after selecting Table.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const q = async (t) => (await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "${t}" } } LIMIT 1`))[0].doc;
const CM = '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ContentMode');
const RM = '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode');
await runScene({ id: 'probe-handles', target: base, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const t of ['Where we have nobody', 'One rep for the South', 'Late: the customer or the shipper?']) {
      const d = await q(t);
      await page.goto(d + CM, { waitUntil: 'load' });
      await page.waitForSelector('.ldh-pane.is-active .content-body > .ldh-block-row', { timeout: 25_000 }); await sleep(6000);
      console.log(`  ${t}:`, JSON.stringify(await page.locator('.ldh-pane.is-active .content-body > .ldh-block-row').evaluateAll((rs) => rs.map((r) => ({ handle: !!r.querySelector('span.ldh-bh-drag'), kind: r.querySelector('.ol-viewport') ? 'map' : r.querySelector('svg') ? 'chart' : r.querySelector('iframe') ? 'video' : r.querySelector('p') ? 'prose' : 'other', cls: r.className.slice(0, 40) })))));
    }
    const s = await q('One rep for the South');
    await page.goto(s + RM, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block-row', { timeout: 25_000 }); await sleep(5000);
    const row = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Reps per region' }).first();
    const sel = row.locator('select.chart-type').first();
    console.log('  pane at load: type=', await sel.evaluate((x) => x.options[x.selectedIndex].textContent.trim()), 'table?', await row.locator('table').count(), 'svg?', await row.locator('svg').count());
    await sel.selectOption({ label: 'Bar chart' }); await sleep(2500);
    console.log('  after Bar chart: table?', await row.locator('table').count(), 'svg?', await row.locator('svg').count());
    await sel.selectOption({ label: 'Table' }); await sleep(2500);
    console.log('  after Table: table?', await row.locator('table').count(), 'svg?', await row.locator('svg').count());
  } });
