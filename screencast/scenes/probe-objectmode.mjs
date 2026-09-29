// Not a scene. What Layout mode does an Object block offer? If the embedding can
// carry its own presentation, a page's evidence renders the way its prose needs
// without touching the shared view.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { base, target, identity } = await resolve('/scratch-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  permissions: ['clipboard-read', 'clipboard-write'],
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
const plain = { click: async (l) => l.click() };
await switchDocumentMode(page, plain, 'content-mode');
await sleep(2500);

await page.locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first().click();
await sleep(3000);

console.log(await page.evaluate(() => {
  const form = [...document.querySelectorAll('form')].filter((f) => f.querySelector('button.btn-save')).pop();
  if (!form) return 'no object form';
  return JSON.stringify({
    fields: [...form.querySelectorAll('input:not([type=hidden]), select')].map((e) => ({
      tag: e.tagName.toLowerCase(),
      cls: String(e.className).trim(),
      name: e.getAttribute('name'),
      options: e.tagName === 'SELECT' ? [...e.options].map((o) => o.textContent.trim()).slice(0, 12) : undefined,
    })),
    labels: [...form.querySelectorAll('.ac-label, label, .lbl')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 8),
  }, null, 1);
}));
await context.close(); await browser.close();
