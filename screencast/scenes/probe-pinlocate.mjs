// Read-only: does the harness see the map, and where is a Southern pin?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { locateMarker } from '../lib/map.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/territories/');
const { base, identity, target } = opts;
const SOUTHERN = (await sparql(base, `PREFIX schema: <https://schema.org/>
SELECT ?t WHERE { GRAPH ?g { ?t schema:containedInPlace <${base}/regions/4/#this> } }`)).map((r) => r.t);
console.log('  southern:', SOUTHERN.length, SOUTHERN[0]);
await runScene({
  id: 'probe-pinlocate', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ol-viewport canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(3000);
    console.log('  maps captured:', await page.evaluate(() => (window.__olMaps || []).length));
    console.log('  locate:', JSON.stringify(await locateMarker(page, SOUTHERN)));
  },
});
