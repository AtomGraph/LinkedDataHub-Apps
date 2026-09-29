import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';

const { target, identity, base, ...a } = await resolve('/');
// Every document is a named graph, so the default graph is empty — a query without
// GRAPH matches nothing, which is what made the first attempt look like a render bug.
const query = `PREFIX schema: <https://schema.org/>

SELECT ?name ?price
WHERE {
  GRAPH ?g {
    ?product a schema:Product ;
      schema:name ?name ;
      schema:price ?price .
  }
}
ORDER BY DESC(?price)`;

await runScene({
  id: 'probe-sparql',
  target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, shot }) {
    await page.goto(`${base}/sparql?query=${encodeURIComponent(query)}`, { waitUntil: 'load' });
    await page.waitForTimeout(14000);
    console.log('url after load:', page.url());
    console.log('\nCodeMirror:', await page.locator('.CodeMirror').count(),
      '| yasqe:', await page.locator('[class*="yasqe"]').count(),
      '| result rows:', await page.locator('table tbody tr').count(),
      '| ac-table:', await page.locator('.ac-table').count());
    console.log('editor text:', (await page.locator('.CodeMirror').first().innerText().catch(() => '(none)')).replace(/\n+/g, ' / ').slice(0, 120));
    await shot('sparql-editor');
  },
}, {});
