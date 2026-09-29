// Not a scene. Opens the first facet on a view and dumps the popover, so the
// facet and pivot beats are scripted against real markup.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/customers/';
const { base, target, identity } = await resolve(where);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
console.log(`probing ${target}`);
await page.goto(target, { waitUntil: 'load' });
await sleep(6000);

const facets = page.locator('.ldh-view-toolbar .left .facet button.facet-pill');
console.log('facet pills:', await facets.count());
for (let i = 0; i < await facets.count(); i++) {
  console.log(`  [${i}] ${JSON.stringify((await facets.nth(i).textContent() ?? '').replace(/\s+/g, ' ').trim())}`);
}

if (await facets.count()) {
  await facets.first().click();
  await sleep(1800);
  console.log(await page.evaluate(() => {
    const pop = document.querySelector('.facet-pop:not(.sort-pop)');
    const opt = pop ? [...pop.querySelectorAll('label, button, li, .facet-opt')].slice(0, 8)
      .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').trim().split(/\s+/).join('.')} — ${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 44)}`) : [];
    return JSON.stringify({
      popClasses: pop?.className ?? null,
      options: opt,
      pivotPills: [...document.querySelectorAll('.ldh-pivot-pill')].map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 44)),
      popHTML: pop ? pop.outerHTML.replace(/\s+/g, ' ').slice(0, 900) : null,
    }, null, 1);
  }));
}

await context.close();
await browser.close();
