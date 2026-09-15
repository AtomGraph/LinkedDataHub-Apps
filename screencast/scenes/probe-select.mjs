// Not a scene. What do the SELECT and View constructors ask for?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { base, target, identity } = await resolve('/team-coverage-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
const plain = { click: async (l) => l.click() };

await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
await switchDocumentMode(page, plain, 'read-mode');
await sleep(3000);

for (const kind of ['SELECT', 'View']) {
  await page.locator('button.drop-toggle').filter({ hasText: 'Create' }).first().click();
  await sleep(1200);
  const item = page.locator('.add-constructor').filter({ hasText: new RegExp(`^category${kind}$`) }).first();
  const fallback = page.locator('.add-constructor').filter({ hasText: kind }).first();
  const target2 = (await item.count()) ? item : fallback;
  if (!(await target2.count())) { console.log(`${kind}: not offered`); continue; }
  await target2.click();
  await sleep(3500);

  console.log(`\n=== ${kind} constructor`);
  console.log(await page.evaluate(() => {
    const modal = document.querySelector('.modal.modal-constructor, .ac-backdrop.modal, .modal');
    const root = modal && modal.offsetParent !== null ? modal : document.querySelector('.ldh-pane.is-active');
    if (!root) return 'nothing';
    return JSON.stringify({
      inModal: !!(modal && modal.offsetParent !== null),
      labels: [...root.querySelectorAll('.ac-label, label, .lbl')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 10),
      inputs: [...root.querySelectorAll('input:not([type=hidden]), select, textarea')]
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/)[0] || '-'}[${e.getAttribute('name') ?? e.type}]`).slice(0, 12),
      yasqe: root.querySelectorAll('.yasqe, .CodeMirror').length,
      buttons: [...root.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8),
    }, null, 1);
  }));
  await page.screenshot({ path: `shots/probe-${kind}.png` });
  await page.keyboard.press('Escape');
  await sleep(1500);
}
await context.close(); await browser.close();
