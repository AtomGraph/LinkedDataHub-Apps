// Not a scene. Does clicking + XHTML persist an empty block, or is the empty state
// only on screen until something is typed?
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
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();

const blocksNow = async () => {
  const r = await page.request.get(target, { headers: { Accept: 'text/turtle' } });
  const t = await r.text();
  return (t.match(/rdf-syntax-ns#_\d+/g) ?? []).length;
};

await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
const fakeCursor = { click: async (l) => l.click() };
await switchDocumentMode(page, fakeCursor, 'content-mode');
await sleep(2500);

console.log('blocks before:', await blocksNow());

const btn = page.locator('button.create-action.add-constructor').filter({ hasText: 'XHTML' }).first();
await btn.click();
await sleep(3000);
console.log('editor open:', await page.locator('.rdfa-editor-content [contenteditable]').count() > 0);
console.log('blocks right after clicking + XHTML:', await blocksNow());

// Now blur without typing anything.
await page.locator('body').click({ position: { x: 40, y: 400 } }).catch(() => {});
await sleep(3000);
console.log('blocks after blurring an untouched editor:', await blocksNow());

await context.close();
await browser.close();
