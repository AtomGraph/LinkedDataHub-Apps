import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import * as nav from '../lib/nav.mjs';

const { target, identity, base, ...a } = await resolve('/');

await runScene({
  id: 'probe-docs-fix2',
  target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot }) {
    const at = async (p, ms = 7000) => { await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(ms); };

    // (4) what the chart block's pencil opens
    await at('/categories/');
    const row = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Revenue by category' }).first();
    await row.scrollIntoViewIfNeeded(); await row.hover(); await page.waitForTimeout(800);
    const pencils = row.locator('button.ac-iconbtn').filter({ hasText: 'edit' });
    console.log('\n[chart] pencils:', await pencils.count());
    await pencils.last().click();
    await page.waitForTimeout(6000);
    console.log('[chart] after pencil — CodeMirror:', await page.locator('.CodeMirror').count(),
      '| yasqe:', await page.locator('[class*="yasqe"]').count(),
      '| textarea:', await page.locator('textarea').count());
    await shot('chart-pencil');

    // (4b) the XHTML block's pencil — the rich-text editor
    await at('/categories/');
    const prose = page.locator('.ldh-pane.is-active .ldh-block-row').first();
    await prose.scrollIntoViewIfNeeded(); await prose.hover(); await page.waitForTimeout(800);
    const p2 = prose.locator('button.ac-iconbtn').filter({ hasText: 'edit' });
    console.log('\n[prose] pencils:', await p2.count());
    if (await p2.count()) {
      await p2.last().click(); await page.waitForTimeout(5000);
      console.log('[prose] contenteditable:', await page.locator('[contenteditable="true"]').count(),
        '| toolbars:', await page.evaluate(() => [...document.querySelectorAll('[class*="toolbar"]')].filter((e) => e.offsetParent).map((e) => e.className).join(' | ') || '(none)'));
      await shot('prose-pencil');
    }

    // (5) the SPARQL endpoint in a browser
    for (const p of ['/sparql', '/sparql?query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D%20LIMIT%2010']) {
      await at(p, 9000);
      console.log(`\n[sparql ${p.slice(0, 20)}] CodeMirror=${await page.locator('.CodeMirror').count()} title="${(await page.title()).slice(0, 40)}" body="${(await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 160)}"`);
    }
    await shot('sparql');

    // (6) the search modal's contents
    await at('/customers/');
    await nav.openTree(page, cursor);
    const box = page.locator('input[name="q"]:visible').first();
    await box.click(); await box.pressSequentially('Chai', { delay: 60 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(14000);
    const modal = page.locator('.ac-modal:visible').first();
    console.log('\n[search] modal text:', (await modal.innerText()).replace(/\n+/g, ' / ').slice(0, 300));
    console.log('[search] links:', await modal.locator('a').count(), '| rows:', await modal.locator('tbody tr, li').count());
    await shot('search-modal');

    // (3) backlinks on an order — visible button only
    await at('/orders/10265/');
    const vis = page.locator('.ldh-pane.is-active button.tb-links:visible').first();
    console.log('\n[order] visible tb-links:', await page.locator('.ldh-pane.is-active button.tb-links:visible').count());
    await vis.scrollIntoViewIfNeeded(); await cursor.click(vis); await page.waitForTimeout(3500);
    console.log('[order] popover:', await page.evaluate(() => {
      const p = [...document.querySelectorAll('*')].find((e) => /BACKLINK/i.test(e.textContent) && e.children.length < 15 && e.offsetParent);
      return p ? p.className + ' links=' + p.querySelectorAll('a').length : '(none)';
    }));
    await shot('order-backlinks');
  },
}, {});
