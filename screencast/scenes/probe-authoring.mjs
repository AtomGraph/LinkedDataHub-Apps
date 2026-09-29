// Not a scene. What modes a view offers, what a result row links to, and what the
// block-add affordances actually open — the three things scenario 1 still needs.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/customers/';
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
page.on('pageerror', (e) => console.log('  pageerror:', e.message.slice(0, 160)));

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(2500);

console.log('=== view modes offered');
await page.locator('.ldh-view-toolbar .right .ldh-mode button.drop-toggle').first().click();
await sleep(800);
console.log(await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('.modes-pop.view-mode-list button.mi')]
    .map((b) => `${b.className} — ${b.querySelector('.label')?.textContent.trim()}`), null, 1)));
await page.keyboard.press('Escape');
await sleep(500);

console.log('\n=== first result row link');
console.log(await page.evaluate(() => {
  const a = document.querySelector('.ldh-block-body a[href*="/customers/"]');
  return a ? JSON.stringify({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 40), cls: a.className }) : 'none';
}));

console.log('\n=== block-add affordances (the pinned bar)');
console.log(await page.evaluate(() => JSON.stringify(
  [...document.querySelectorAll('button, a')]
    .filter((e) => /XHTML|Object|Chart|View|Query|SPARQL/i.test(e.textContent ?? ''))
    .slice(0, 14)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).join('.')} — ${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}`), null, 1)));

console.log('\n=== Create menu');
const create = page.locator('button.drop-toggle', { hasText: 'Create' }).first();
if (await create.count()) {
  await create.click();
  await sleep(900);
  console.log(await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('.ac-menu .it, .ac-menu-item, .add-constructor')]
      .map((e) => `${String(e.className).trim()} — ${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}`).slice(0, 14), null, 1)));
  await page.keyboard.press('Escape');
}

console.log('\n=== clicking + Object');
// The visible label is "addObject" — "add" is a Material icon ligature, not text.
const obj = page.locator('button.create-action.add-constructor').filter({ hasText: 'Object' }).first();
if (await obj.count()) {
  await obj.click();
  await sleep(2500);
  console.log(await page.evaluate(() => {
    const modal = document.querySelector('.modal, .ac-backdrop, .modal-constructor');
    return JSON.stringify({
      modal: modal?.className ?? null,
      heading: modal?.querySelector('h1,h2,h3,.ttl')?.textContent.trim().slice(0, 60),
      fields: [...(modal?.querySelectorAll('input, select, textarea, .CodeMirror') ?? [])]
        .slice(0, 12).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).join('.')}[${e.getAttribute('name') ?? ''}]`),
      buttons: [...(modal?.querySelectorAll('button') ?? [])].slice(0, 8).map((b) => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)),
    }, null, 1);
  }));
  await page.screenshot({ path: 'tracks/probe-object-modal.png' });
}

await context.close();
await browser.close();
