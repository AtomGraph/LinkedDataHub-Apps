// Read-only: the pivot pills on the Employees view, what the Territory pivot offers next,
// the Region pivot's rows, and Southern's page in Content mode. Nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { contentModeUrl } from '../lib/blocks.mjs';
const opts = await resolve('/employees/');
const { base } = opts;
const info = (page) => page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].filter((b) => b.querySelector('.ldh-view-toolbar')).map((v) => ({ title: v.querySelector('h2,h3,.ldh-bh-title')?.textContent.trim().slice(0, 40), count: v.querySelector('.ldh-view-toolbar .count')?.textContent.trim(), mode: v.querySelector('.ldh-view-toolbar .right .ldh-mode button.drop-toggle')?.textContent.replace(/expand_more/g, '').trim(), pills: [...v.querySelectorAll('.ldh-pivot-pill')].map((p) => p.textContent.trim().replace(/\s+/g, ' ')), imgs: v.querySelectorAll('img').length })));
await runScene({ id: 'probe-nw-chain', target: opts.target, identity: opts.identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(opts.target, { waitUntil: 'load' }); await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 40_000 }); await sleep(3000);
    console.log('  employees:', JSON.stringify(await info(page)));
    const view = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') }).first();
    const bar = view.locator('details.ldh-pivot-bar').first();
    if (await bar.count() && !(await bar.evaluate((d) => d.open))) { await bar.locator('summary').first().click(); await sleep(600); }
    const t = view.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Territory' }).first();
    await t.click(); await sleep(4000);
    console.log('  after Territory:', JSON.stringify(await info(page)));
    const v2 = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') });
    const n = await v2.count();
    for (let i = 0; i < n; i++) { const b = v2.nth(i).locator('details.ldh-pivot-bar').first(); if (await b.count() && !(await b.evaluate((d) => d.open))) { await b.locator('summary').first().click().catch(() => {}); await sleep(400); } }
    console.log('  pills open:', JSON.stringify(await info(page)));
    const r = ui(page).locator('.ldh-pivot-pill:visible').filter({ hasText: /Region|Contained in|Place/ }).last();
    console.log('  region pill:', await r.count(), await r.textContent().catch(() => ''));
    if (await r.count()) { await r.click(); await sleep(4000); console.log('  after Region:', JSON.stringify(await info(page))); console.log('  rows:', await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].filter((b) => b.querySelector('.ldh-view-toolbar')).at(-1)?.innerText.slice(0, 400).replace(/\n+/g, ' | '))); }
    await page.screenshot({ path: process.env.SHOTS + '/nw-chain.png' });
    await page.goto(contentModeUrl(`${base}/regions/4/`), { waitUntil: 'load' }); await sleep(5000);
    console.log('  southern content rows:', await page.evaluate(() => document.querySelectorAll('.ldh-pane.is-active .ldh-block-row').length), 'buttons:', await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active button.create-action.add-constructor')].map((b) => b.textContent.trim()).join(',')));
  } });
