// Read-only: open Create ▸ SELECT on the compose page, type the query fast, read it
// back, print the difference, leave without saving.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { create } from '../lib/constructors.mjs';
import { ui } from '../lib/dom.mjs';
const opts = await resolve('/supercut-compose/');
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?region (COUNT(DISTINCT ?rep) AS ?reps)
WHERE {
GRAPH ?g {
?rep schema:areaServed ?territory .
}
GRAPH ?h {
?territory schema:containedInPlace ?place .
}
GRAPH ?i {
?place schema:name ?region .
}
}
GROUP BY ?region
ORDER BY DESC(?reps)`;
await runScene({ id: 'probe-typequery', target: opts.target + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode'), identity: opts.identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(opts.target + '?mode=' + encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode'), { waitUntil: 'load' }); await sleep(3000);
    const cs = await create(page, cursor, 'SELECT'); if (!cs.ok) throw new Error(cs.why);
    const code = ui(page).locator('.CodeMirror').first(); await cursor.click(code); await sleep(400);
    const lines = QUERY.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) await page.keyboard.type(lines[i], { delay: 14 });
      if (i < lines.length - 1) { await sleep(160); if (await page.locator('.CodeMirror-hints:visible').count()) { await page.keyboard.press('Escape'); await sleep(120); } await page.keyboard.press('Enter'); }
    }
    await sleep(1200);
    const got = await page.evaluate(() => document.querySelector('.ldh-pane.is-active .CodeMirror')?.CodeMirror?.getValue());
    const flat = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);
    const a = flat(QUERY), b = flat(got ?? '');
    console.log('  same:', JSON.stringify(a) === JSON.stringify(b));
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) console.log(`  line ${i}: want ${JSON.stringify(a[i])} got ${JSON.stringify(b[i])}`);
  } });
