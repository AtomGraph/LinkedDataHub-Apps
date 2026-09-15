// Not a scene. Types a formatted query into the editor and reads it back, because
// auto-indent and bracket auto-closing mangle text silently.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { create } from '../lib/constructors.mjs';

const { base, target, identity } = await resolve('/scratch-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
const plain = { click: async (l) => l.click() };

await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
await switchDocumentMode(page, plain, 'read-mode');
await sleep(3000);
console.log('create SELECT:', JSON.stringify(await create(page, plain, 'SELECT')));
await sleep(2500);

const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?category (COUNT(?product) AS ?products)
WHERE {
GRAPH ?g {
?product a schema:Product ;
schema:category ?category .
}
}
GROUP BY ?category
ORDER BY DESC(?products)`;

const code = page.locator('.ldh-pane.is-active .CodeMirror').first();
console.log('editor visible:', await code.isVisible().catch(() => false));
await code.click();
await sleep(400);
await page.keyboard.type(QUERY, { delay: 12 });
await sleep(1500);

const back = await page.evaluate(() => {
  const cm = document.querySelector('.ldh-pane.is-active .CodeMirror');
  return cm?.CodeMirror ? cm.CodeMirror.getValue() : (cm?.innerText ?? 'no editor');
});
console.log('--- read back ---');
console.log(back);
console.log('--- end ---');
await page.screenshot({ path: 'shots/probe-typequery.png' });
await context.close(); await browser.close();
