// Read-only: what a page offers for creating a resource — its blocks, which of them carry a
// constructor (data-for-class, an add-instance button), the floating Create menu — and how
// many leftover fixtures the data holds. Answered on 2026-09-19 that /territories/ has no
// constructor (document views never do; only the ontology's class views get one) while a
// territory's own "Employees serving this territory" view does.
//   node scenes/probe-territories-create.mjs --paths=/territories/,/regions/4/ --base … --cert-file … --cert-password-file …
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const { base, identity } = await resolve('/');
const rows = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc ?title WHERE { GRAPH ?doc { ?doc dct:title ?title } FILTER(?title IN ("El Paso", "Houston")) }`).catch((e) => 'sparql failed: ' + e.message);
console.log('El Paso / Houston docs:', JSON.stringify(rows));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, ...(identity ? { clientCertificates: identity } : {}) });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await ctx.newPage();
const paths = (process.argv.find((a) => a.startsWith('--paths=')) ?? '--paths=/territories/,/regions/4/').slice(8).split(',');
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log(p, JSON.stringify(await page.evaluate(() => ({
    mode: document.querySelector('.ldh-pane.is-active .ldh-block[data-mode], .ldh-pane.is-active [class*="mode"]')?.className.slice(0, 40) ?? null,
    blocks: [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].map((b) => ({ title: b.querySelector('h2, h3, .ldh-block-title')?.textContent.trim().slice(0, 40), forClass: b.dataset.forClass ?? null, addInstance: b.querySelectorAll('button.add-instance').length, toolbar: !!b.querySelector('.ldh-view-toolbar') })),
    createMenu: [...document.querySelectorAll('button.create-action, .create-action')].map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)),
    links: [...document.querySelectorAll('.ldh-pane.is-active .ldh-block a')].map((a) => a.textContent.trim()).filter((t) => /region/i.test(t)).slice(0, 5),
  })), null, 1));
}
await browser.close();
