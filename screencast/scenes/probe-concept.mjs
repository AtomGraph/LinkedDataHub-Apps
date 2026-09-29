// Not a scene. What copy affordances exist on a proxied resource page?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const { base, target, identity } = await resolve('/categories/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  permissions: ['clipboard-read', 'clipboard-write'],
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await sleep(3000);
await page.locator('button.btn-apps').first().click(); await sleep(1200);
await page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first().click();
await page.waitForLoadState('load').catch(() => {}); await sleep(5000);
const concepts = page.locator('.ldh-block-body a:visible').filter({ hasText: 'Concepts' }).first();
if (await concepts.count()) { await concepts.click(); await page.waitForLoadState('load').catch(()=>{}); await sleep(5000); }
const first = page.locator('.ldh-block-body a:visible').first();
if (await first.count()) { await first.click(); await page.waitForLoadState('load').catch(()=>{}); await sleep(6000); }

console.log('url:', page.url().slice(0, 120));
console.log('panes:', await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.ldh-pane')].map((p) => `${String(p.className).trim()} vis=${p.offsetParent !== null}`))));
console.log('active-pane copy buttons:', await page.evaluate(() => {
  const pane = document.querySelector('.ldh-pane.is-active');
  if (!pane) return 'NO ACTIVE PANE';
  const bs = [...pane.querySelectorAll('.btn-copy-uri')];
  return JSON.stringify(bs.map((b) => {
    const r = b.getBoundingClientRect();
    return `vis=${b.offsetParent !== null} box=${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.x)},${Math.round(r.y)} opacity=${getComputedStyle(b).opacity}`;
  }), null, 1);
}));
console.log('chain of the first on-screen one:', await page.evaluate(() => {
  const b = [...document.querySelectorAll('.btn-copy-uri')].find((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().top > 0);
  if (!b) return 'none on screen';
  const chain = [];
  for (let n = b; n && n !== document.body; n = n.parentElement) chain.push(`${n.tagName.toLowerCase()}.${String(n.className).trim().split(/\s+/).slice(0,3).join('.')}`);
  return chain.slice(0, 8).join(' < ');
}));
console.log(await page.evaluate(() => JSON.stringify({
  copyish: [...document.querySelectorAll('button, a')]
    .filter((e) => /copy|link|uri/i.test(e.className + ' ' + (e.title || '') + ' ' + e.textContent))
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} vis=${e.offsetParent !== null} txt=${e.textContent.replace(/\s+/g,' ').trim().slice(0,18)}`).slice(0, 12),
  anyCopyUri: document.querySelectorAll('.btn-copy-uri').length,
  pins: document.querySelectorAll('.ldh-pin-ic, [class*=pin]').length,
}, null, 1)));
await page.screenshot({ path: 'shots/probe-concept.png' });
await context.close(); await browser.close();
