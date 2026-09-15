// Not a scene. How the search shortcut opens and what it offers, so scenes can jump
// straight to a resource by name instead of walking the tree.
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
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 120)));
await page.goto(target, { waitUntil: 'load' });
await sleep(4000);

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
await page.keyboard.press(`${modifier}+KeyK`);
await sleep(2000);

console.log('after the shortcut:', await page.evaluate(() => JSON.stringify({
  dialogs: [...document.querySelectorAll('.ac-backdrop, .modal, dialog')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()}`),
  inputs: [...document.querySelectorAll('input')].filter((e) => e.offsetParent !== null)
    .map((e) => `${String(e.className).trim() || e.type}[name=${e.name || ''}] placeholder=${e.placeholder || ''}`),
}, null, 1)));

const box = page.locator('input[type=search], .sb-search input, input[name=q]').filter({ visible: true }).first();
if (await box.count()) {
  await box.click();
  await box.pressSequentially('Employees', { delay: 60 });
  await sleep(2500);
  console.log('results:', await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.typeahead a, .typeahead li, .ac-menu-item, [class*=result] a')]
      .filter((e) => e.offsetParent !== null).slice(0, 8)
      .map((a) => `${a.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)} → ${a.getAttribute('href') ?? ''}`), null, 1)));
  await page.keyboard.press('Enter');
  await sleep(3000);
  console.log('url after Enter:', page.url());
}
await page.screenshot({ path: 'shots/probe-search.png' });
await context.close(); await browser.close();
