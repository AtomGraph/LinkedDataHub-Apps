// Read-only: the SAME view (Northwind employees) rendered in Grid, Table and List modes,
// as markup — templates for the six-shapes shot. Mode switches are UI state, nothing saved.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const p = await ctx.newPage();
await p.goto(`${base}/employees/`, { waitUntil: 'load' }); await p.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 30_000 }); await p.waitForTimeout(4000);
const grab = async (name) => {
  const html = await p.evaluate(async () => {
    const root = document.querySelector('.ldh-pane.is-active .ldh-block .container-results') || document.querySelector('.ldh-pane.is-active .container-results');
    const clone = root.cloneNode(true);
    const imgs = [...root.querySelectorAll('img')], cimgs = [...clone.querySelectorAll('img')];
    for (let i = 0; i < imgs.length; i++) { try { const r = await fetch(imgs[i].src); const bl = await r.blob(); const d = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); cimgs[i].setAttribute('src', d); } catch {} }
    clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id')); clone.querySelectorAll('script').forEach((e) => e.remove());
    return clone.outerHTML;
  });
  await fs.writeFile(`mock/templates/results-${name}.html`, html);
  console.log(`  ${name}: ${Math.round(html.length / 1024)} KB`);
};
await grab('grid');
for (const [mode, ready] of [['table-mode', 'table tbody tr'], ['list-mode', '.ldh-list-block, li, .list-item']]) {
  const toggle = p.locator('.ldh-pane.is-active .ldh-view-toolbar .ldh-mode .drop-toggle').first();
  await toggle.click(); await p.waitForTimeout(500);
  const item = p.locator(`.ldh-pane.is-active .ldh-view-toolbar .ldh-mode .modes-pop.view-mode-list button.mi.${mode}`).first();
  if (await item.count()) { await item.click(); await p.locator('.ldh-pane.is-active .container-results ' + ready).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {}); await p.waitForTimeout(2500); await grab(mode.replace('-mode', '')); } else { console.log(`  ${mode}: not offered`); await p.keyboard.press('Escape'); }
}
// the mode menu itself, open
const toggle = p.locator('.ldh-pane.is-active .ldh-view-toolbar .ldh-mode .drop-toggle').first(); await toggle.click(); await p.waitForTimeout(500);
await fs.writeFile('mock/templates/mode-menu.html', await p.evaluate(() => document.querySelector('.ldh-pane.is-active .ldh-view-toolbar .ldh-mode').outerHTML.replace(/ id="[^"]*"/g, '')));
console.log('  mode menu captured');
await b.close();
