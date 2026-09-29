// Not a scene. Switches the products view to Chart mode, sets the axes, and dumps
// what the block actually contains — the chart beat renders controls but no chart.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/products/');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('  console.error:', m.text().slice(0, 200)); });
page.on('requestfailed', (r) => console.log('  requestfailed:', r.url().slice(0, 110)));

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);

const block = page.locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();

await page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first().click();
await sleep(600);
await page.locator('.modes-pop.view-mode-list button.mi.chart-mode').first().click();
await sleep(3000);
console.log('switched to chart mode');

for (const [cls, label] of [['chart-type', 'Bar chart'], ['chart-category', 'category'], ['chart-series', 'price']]) {
  const sel = block.locator(`select.${cls}`).first();
  if (!(await sel.count())) { console.log(`  ${cls}: absent`); continue; }
  await sel.selectOption({ label });
  console.log(`  ${cls} = ${label}  →  value now ${JSON.stringify(await sel.inputValue())}`);
  await sleep(1500);
}

await sleep(4000);

console.log('\nblock contents after setting axes:');
console.log(await block.evaluate((b) => {
  const kids = [...b.querySelectorAll('*')];
  return JSON.stringify({
    svgs: kids.filter((e) => e.tagName.toLowerCase() === 'svg').length,
    canvases: kids.filter((e) => e.tagName.toLowerCase() === 'canvas').length,
    chartish: kids.filter((e) => /chart|viz|google/i.test(String(e.className))).slice(0, 8)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} ${e.getBoundingClientRect().width}x${Math.round(e.getBoundingClientRect().height)}`),
    buttons: [...b.querySelectorAll('button')].map((x) => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 24)).filter(Boolean).slice(0, 14),
    tail: b.innerHTML.replace(/\s+/g, ' ').slice(-700),
  }, null, 1);
}));

console.log('\ngoogle charts loaded?', await page.evaluate(() => typeof google !== 'undefined' && !!google?.visualization));

await page.screenshot({ path: 'tracks/probe-chart.png' });
await context.close();
await browser.close();
