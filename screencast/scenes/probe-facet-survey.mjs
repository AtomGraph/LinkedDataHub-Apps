// Not a scene. Opens every facet a view offers and times how long its values take,
// so a scene can pick one that actually loads. Name/title facets are the slow ones.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/orders/';
const BUDGET = 12_000;
const { base, target, identity } = await resolve(where);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);

const pills = page.locator('.ldh-view-toolbar .left .facet button.facet-pill');
const n = await pills.count();
console.log(`${target}\n${n} facet(s)\n`);

// Escape leaves the previous popover's values in the DOM, so a survey that opens
// several facets in one page read stale content and reported 0.0s. One facet per
// page load is the only honest measurement.
const only = argv.includes('--facet') ? Number(argv[argv.indexOf('--facet') + 1]) : null;

for (let i = 0; i < n; i++) {
  if (only !== null && i !== only) continue;
  if (i > 0 && only === null) {
    await page.reload({ waitUntil: 'load' });
    await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
    await sleep(2500);
  }
  const pill = pills.nth(i);
  const label = (await pill.textContent() ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const prop = await pill.getAttribute('title');
  process.stdout.write(`  [${i}] ${label.padEnd(32)} ${String(prop).padEnd(46)} `);

  await pill.click();
  const t = Date.now();
  const ok = await page.waitForFunction(
    () => !document.querySelector('.facet-pop:not(.sort-pop) .facet-loading'),
    null, { timeout: BUDGET },
  ).then(() => true, () => false);
  const ms = Date.now() - t;

  const values = await page.evaluate(() => {
    const v = document.querySelector('.facet-pop:not(.sort-pop) .facet-values');
    if (!v) return { n: 0, sample: [], html: null };
    const kids = [...v.children];
    return {
      n: kids.length,
      sample: kids.slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} — ${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 28)}`),
      html: v.outerHTML.replace(/\s+/g, ' ').slice(0, 700),
    };
  });

  console.log(ok ? `loaded in ${(ms / 1000).toFixed(1)}s — ${values.n} value(s)`
                 : `TIMED OUT after ${BUDGET / 1000}s`);
  if (ok && values.n) {
    for (const s of values.sample) console.log(`        ${s}`);
    if (process.argv.includes('--html')) console.log(`        ${values.html}`);
  }

  await page.keyboard.press('Escape');
  await sleep(600);
}

await context.close();
await browser.close();
