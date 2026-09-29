// Not a scene. The left drawer's document tree is the efficient way to reach a
// sibling container; this dumps how to open it and what it offers.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/team-coverage-briefing/');
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
await sleep(3500);

console.log('tree links before hover:', await page.locator('.tree-link').count());
// The drawer opens on left-edge mousemove.
await page.mouse.move(400, 400);
await page.mouse.move(2, 400);
await sleep(1500);
await page.mouse.move(6, 420);
await sleep(2000);

console.log('after edge hover:', await page.evaluate(() => JSON.stringify({
  treeLinks: [...document.querySelectorAll('.tree-link')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()).slice(0, 14),
  drawerVisible: [...document.querySelectorAll('[class*=drawer], .sb, aside, nav')]
    .filter((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 100)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} ${Math.round(e.getBoundingClientRect().width)}px`).slice(0, 6),
}, null, 1)));

await page.screenshot({ path: 'shots/probe-tree.png' });
await context.close();
await browser.close();
