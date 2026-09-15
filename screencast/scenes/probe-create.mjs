// Not a scene. What the Create menu offers, per document and per mode.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/team-coverage-briefing/';
const { base, target, identity } = await resolve(where);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
const plain = { click: async (l) => l.click() };

const offers = async (label) => {
  const btn = page.locator('button.drop-toggle').filter({ hasText: 'Create' }).first();
  if (!(await btn.count())) return console.log(`${label}: no Create button`);
  await btn.click();
  await sleep(1400);
  console.log(`${label}:`, await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.add-constructor')].filter((e) => e.offsetParent !== null)
      .map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 26)))));
  await page.keyboard.press('Escape');
  await sleep(700);
};

await page.goto(target, { waitUntil: 'load' });
await sleep(4000);
console.log('document:', where, '| mode in url:', page.url().includes('mode=') ? page.url().split('mode=')[1].slice(-20) : 'default');
await offers('  as opened     ');

for (const m of ['read-mode', 'content-mode']) {
  const ok = await switchDocumentMode(page, plain, m);
  await sleep(2500);
  await offers(`  after ${m.padEnd(13)}`.slice(0, 22) + (ok ? '' : ' (switch failed)'));
}
await context.close(); await browser.close();
