// Not a scene. Drives the + XHTML and + Object affordances on a scratch document
// and reports the inline forms, so the accumulation scenes are scripted against
// real markup rather than a screenshot.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/scratch-briefing/';
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
page.on('pageerror', (e) => console.log('  PAGEERROR:', e.message.slice(0, 140)));

await page.goto(target, { waitUntil: 'load' });
await sleep(5000);
console.log('url:', page.url());
console.log('add buttons:', await page.locator('button.create-action.add-constructor').count());
for (const b of await page.locator('button.create-action.add-constructor').all()) {
  console.log('  •', (await b.textContent()).replace(/\s+/g, ' ').trim(), '| visible:', await b.isVisible());
}

const kind = argv.includes('--kind') ? argv[argv.indexOf('--kind') + 1] : 'XHTML';
const btn = page.locator('button.create-action.add-constructor').filter({ hasText: kind }).first();
if (!(await btn.count())) { console.log(`${kind} absent`); await context.close(); await browser.close(); process.exit(0); }

await btn.scrollIntoViewIfNeeded();
await btn.click();
await sleep(3000);

console.log(`\n=== what appeared for + ${kind}`);
console.log(await page.evaluate(() => {
  const vis = (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  return JSON.stringify({
    contenteditable: [...document.querySelectorAll('[contenteditable]')].filter(vis)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`),
    toolbar: [...document.querySelectorAll('[class*=toolbar], [class*=rdfa], [class*=editor]')].filter(vis)
      .slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim()}`),
    saveish: [...document.querySelectorAll('button, .ac-btn')].filter(vis)
      .map((b) => `${String(b.className).trim().split(/\s+/).filter((c) => /save|btn-|close|cancel/.test(c)).join('.')} — ${b.textContent.replace(/\s+/g, ' ').trim().slice(0, 16)}`)
      .filter((t) => t && !t.startsWith(' —')).slice(0, 12),
    blockRows: document.querySelectorAll('.ldh-block-row').length,
  }, null, 1);
}));

await page.screenshot({ path: `shots/probe-add-${kind}.png` });
console.log(`→ shots/probe-add-${kind}.png`);
await context.close();
await browser.close();
