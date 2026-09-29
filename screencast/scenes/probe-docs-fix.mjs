import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import * as nav from '../lib/nav.mjs';

const { target, identity, base, ...a } = await resolve('/');

await runScene({
  id: 'probe-docs-fix',
  target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    const at = async (p, ms = 6500) => { await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(ms); };
    const classesUnder = (sel) => page.evaluate((s) => {
      const root = document.querySelector(s);
      if (!root) return `(no ${s})`;
      return [...new Set([...root.querySelectorAll('*')].map((e) => e.className).filter((c) => typeof c === 'string' && c))].slice(0, 40).join(' · ');
    }, sel);

    // 1 + 2: the navbar and the drawer's real anatomy
    await at('/customers/');
    console.log('\n[navbar] top-level classes:', await page.evaluate(() =>
      [...document.querySelectorAll('body > *, body > * > *')].map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 3).join('.')).slice(0, 14).join(' | ')));
    console.log('[navbar] address-ish:', await page.evaluate(() =>
      [...document.querySelectorAll('input, form')].map((e) => e.tagName.toLowerCase() + '[' + (e.name || e.className) + ']').slice(0, 12).join(' | ')));

    await nav.openTree(page, cursor);
    await page.waitForTimeout(1500);
    console.log('\n[drawer] container of .tree-link:', await page.evaluate(() => {
      let e = document.querySelector('.tree-link'); const chain = [];
      while (e && chain.length < 8) { chain.push(e.tagName.toLowerCase() + '.' + String(e.className).split(' ').join('.')); e = e.parentElement; }
      return chain.join(' ← ');
    }));
    console.log('[drawer] classes:', await classesUnder('.sidebar, aside, [class*="drawer"], [class*="sidebar"]'));
    console.log('[drawer] expanders:', await page.evaluate(() =>
      [...document.querySelectorAll('.tree-link')].slice(0, 3).map((a) => a.parentElement.outerHTML.slice(0, 220)).join('\n   ')));
    console.log('[drawer] counts near numbers:', await page.evaluate(() =>
      [...document.querySelectorAll('a, li, div')].filter((e) => /^\s*\S[\s\S]{0,40}\s\d{2,}\s*$/.test(e.textContent) && e.children.length <= 3).slice(0, 6).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0,2).join('.') + ' = ' + e.textContent.trim().slice(0, 40)).join(' | ')));

    // 3: does /orders/10265/ exist, and what backlinks does it carry
    await at('/orders/10265/');
    console.log('\n[order] title:', (await page.title()).slice(0, 60), '| tb-links:', await page.locator('.ldh-pane.is-active button.tb-links').count());
    const lb = page.locator('.ldh-pane.is-active button.tb-links').first();
    if (await lb.count()) {
      await lb.click(); await page.waitForTimeout(3000);
      console.log('[order] popover html:', (await page.evaluate(() => {
        const p = [...document.querySelectorAll('*')].find((e) => /BACKLINKS/.test(e.textContent) && e.children.length < 12 && e.offsetParent);
        return p ? p.outerHTML.slice(0, 400) : '(none)';
      })));
    }

    // 4: what control opens a query block's editor
    await at('/categories/');
    console.log('\n[block] row controls:', await page.evaluate(() => {
      const row = [...document.querySelectorAll('.ldh-block-row')].find((r) => /Revenue by category/.test(r.textContent));
      if (!row) return '(no such row)';
      return [...row.querySelectorAll('button, a')].map((b) => b.tagName.toLowerCase() + '.' + String(b.className).split(' ').slice(0, 3).join('.') + '{' + b.textContent.trim().slice(0, 18) + '}').slice(0, 18).join(' | ');
    }));
    console.log('[block] contenteditable count:', await page.locator('[contenteditable]').count(), '| rdfa:', await page.locator('[class*="rdfa"]').count());

    // 5: the /sparql editor's run control
    await at('/sparql', 9000);
    console.log('\n[sparql] url:', page.url());
    console.log('[sparql] CodeMirror:', await page.locator('.CodeMirror').count(), '| buttons:', await page.evaluate(() =>
      [...document.querySelectorAll('button, input[type=submit], .yasqe_queryButton')].map((b) => b.tagName.toLowerCase() + '.' + String(b.className).split(' ').slice(0, 3).join('.') + '{' + (b.textContent || b.value || '').trim().slice(0, 20) + '}').slice(0, 20).join(' | ')));

    // 6: the search dialog after submit
    await at('/customers/');
    await nav.openTree(page, cursor);
    const box = page.locator('input[name="q"]:visible').first();
    console.log('\n[search] input found:', await box.count());
    if (await box.count()) {
      await box.click(); await box.pressSequentially('Chai', { delay: 60 });
      await page.keyboard.press('Enter'); await page.waitForTimeout(8000);
      console.log('[search] dialogs:', await page.evaluate(() =>
        [...document.querySelectorAll('.modal, [role=dialog], [class*="dialog"]')].filter((e) => e.offsetParent).map((e) => e.className + ' links=' + e.querySelectorAll('a').length).join(' | ') || '(none)'));
      console.log('[search] url now:', page.url());
    }
  },
}, {});
