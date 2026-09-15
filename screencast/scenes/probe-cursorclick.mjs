// Not a scene. Does the injected cursor's raw mouse click reach the pinned
// + XHTML button, or does only Playwright's own click work?
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { CURSOR_INIT, makeCursor } from '../lib/cursor.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { base, target, identity } = await resolve('/team-coverage-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  permissions: ['clipboard-read', 'clipboard-write'],
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
await context.addInitScript(CURSOR_INIT);
const page = await context.newPage();
const cursor = makeCursor(page);

await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
console.log('mode switch:', await switchDocumentMode(page, cursor, 'content-mode'));
await sleep(2500);

const btn = page.locator('button.create-action.add-constructor').filter({ hasText: 'XHTML' }).first();
const box = await btn.boundingBox();
console.log('button box:', box && `${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`);
console.log('at that point:', await page.evaluate(([x, y]) => {
  const e = document.elementFromPoint(x, y);
  return e ? `${e.tagName.toLowerCase()}.${String(e.className).trim()}` : 'nothing';
}, [box.x + box.width / 2, box.y + box.height / 2]));

await cursor.click(btn);
await sleep(3000);
console.log('editor after cursor.click:', await page.locator('.rdfa-editor-content [contenteditable]').count());

if (!(await page.locator('.rdfa-editor-content [contenteditable]').count())) {
  await btn.click();
  await sleep(3000);
  console.log('editor after locator.click:', await page.locator('.rdfa-editor-content [contenteditable]').count());
}
await context.close(); await browser.close();
