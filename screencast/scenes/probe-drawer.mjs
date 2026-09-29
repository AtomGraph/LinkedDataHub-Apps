// Not a scene. What actually opens the drawer, and what the tree looks like once open.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/team-coverage-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await sleep(4000);

const state = async (label) => console.log(label, await page.evaluate(() => JSON.stringify({
  total: document.querySelectorAll('.tree-link').length,
  visible: [...document.querySelectorAll('.tree-link')].filter((a) => a.offsetParent !== null).length,
  firstBox: (() => { const a = document.querySelector('.tree-link'); if (!a) return null;
    const r = a.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; })(),
  containers: [...document.querySelectorAll('[class*=sb-], [class*=drawer], aside')].slice(0, 8)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} vis=${e.offsetParent !== null} w=${Math.round(e.getBoundingClientRect().width)}`),
})));

await state('initial   ');
await page.mouse.move(700, 400); await sleep(300);
await page.mouse.move(3, 420);   await sleep(1800);
await state('edge hover');
await page.mouse.move(60, 430);  await sleep(1500);
await state('inside    ');
await page.screenshot({ path: 'shots/probe-drawer.png' });
await context.close(); await browser.close();
