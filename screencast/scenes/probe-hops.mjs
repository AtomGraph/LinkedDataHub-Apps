// Not a scene. Chains parallax hops and reports what each one offers and yields,
// so a scene can pick a route that stays interesting rather than dead-ending.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/products/';
const facetIdx = argv.includes('--facet') ? Number(argv[argv.indexOf('--facet') + 1]) : null;
const wanted = argv.includes('--values') ? argv[argv.indexOf('--values') + 1].split(',') : [];
const route = argv.includes('--route') ? argv[argv.indexOf('--route') + 1].split(',') : [];
const { base, target, identity } = await resolve(where);
const HOPS = 4;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 120)));

const total = async () => (await page.locator('.ldh-view-toolbar .right .count b').first().textContent().catch(() => '?')).trim();
const steps = async () => page.evaluate(() => [...document.querySelectorAll('.parallax-steps button.parallax-step')]
  .map((b) => b.querySelector('.val')?.textContent.trim()));

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);

// optionally filter first, so the hops carry it
if (facetIdx !== null) {
  const pill = page.locator('.ldh-view-toolbar .left .facet button.facet-pill').nth(facetIdx);
  await pill.click();
  await page.waitForFunction(() => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'), null, { timeout: 20_000 }).catch(() => {});
  await sleep(700);
  const opts = page.locator('.facet-pop:not(.sort-pop) .facet-values button.opt');
  console.log('facet values:', JSON.stringify((await opts.allTextContents()).slice(0, 10).map((s) => s.replace(/\s+/g, ' ').trim())));
  for (const w of (wanted.length ? wanted : [])) {
    const o = opts.filter({ hasText: w }).first();
    if (await o.count()) { await o.click(); await sleep(1800); }
  }
  await pill.click();
  await sleep(1000);
}
console.log(`start: ${await total()} results\n`);

for (let hop = 1; hop <= HOPS; hop++) {
  const summary = page.locator('details.ldh-pivot-bar summary').first();
  if (!(await summary.count())) { console.log(`hop ${hop}: no pivot bar`); break; }
  if ((await summary.evaluate((e) => e.parentElement.open)) !== true) {
    await summary.click();
    await sleep(900);
  }

  const pills = page.locator('.ldh-pivot-pill:visible');
  const names = (await pills.allTextContents()).map((s) => s.replace(/\s+/g, ' ').trim());
  if (!names.length) { console.log(`hop ${hop}: no pills offered`); break; }
  console.log(`hop ${hop} offers: ${JSON.stringify(names)}`);

  // follow the named route when given, else prefer an untaken forward hop
  const taken = await steps();
  let idx = -1;
  if (route[hop - 1]) idx = names.findIndex((n) => n.includes(route[hop - 1]));
  if (idx === -1) idx = names.findIndex((n) => n.includes('arrow_forward') && !taken.some((t) => n.includes(t)));
  if (idx === -1) idx = 0;

  await pills.nth(idx).click();
  await sleep(4000);
  console.log(`  → took ${JSON.stringify(names[idx])}: ${await total()} results, steps ${JSON.stringify(await steps())}\n`);
}

await context.close();
await browser.close();
