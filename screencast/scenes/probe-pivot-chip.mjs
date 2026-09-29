// Not a scene. Pivots a view, then dumps the parallax chip the toolbar grows, so
// the "step back out" control is clicked by name rather than by guess.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/products/';
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
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 180)));

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);

await page.locator('details.ldh-pivot-bar summary').first().click();
await sleep(1200);
await page.locator('.ldh-pivot-pill:visible').first().click();
await sleep(3500);

console.log('after pivot, toolbar .left:');
console.log(await page.evaluate(() => {
  const left = document.querySelector('.ldh-view-toolbar .left');
  return left ? left.outerHTML.replace(/\s+/g, ' ').slice(0, 1400) : 'none';
}));

console.log('\nparallax-steps:');
console.log(await page.evaluate(() => {
  const s = document.querySelector('.parallax-steps');
  return s ? s.outerHTML.replace(/\s+/g, ' ').slice(0, 1000) : 'none';
}));

// Try the documented-looking control and watch for the XSLT error.
console.log('\nclicking the step chip\'s own dismiss:');
const dismiss = page.locator('.parallax-steps button').last();
if (await dismiss.count()) {
  console.log('  target:', await dismiss.evaluate((e) => `${e.tagName.toLowerCase()}.${e.className} title=${e.title}`));
  await dismiss.click();
  await sleep(3000);
  console.log('  total now:', await page.locator('.ldh-view-toolbar .right .count b').first().textContent().catch(() => '?'));
} else {
  console.log('  no button inside .parallax-steps');
}

await context.close();
await browser.close();
