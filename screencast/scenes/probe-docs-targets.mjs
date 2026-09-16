import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';

const { target, identity, base, ...a } = await resolve('/');

await runScene({
  id: 'probe-docs-targets',
  target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page }) {
    const at = async (path, ms = 6500) => {
      await page.goto(base + path, { waitUntil: 'load' });
      await page.waitForTimeout(ms);
    };

    for (const path of ['/', '/categories/', '/products/', '/orders/']) {
      await at(path);
      const blocks = await page.locator('.ldh-pane.is-active .ldh-block').allInnerTexts();
      console.log(`\n${path}`);
      console.log(`  blocks: ${blocks.map((t) => t.split('\n')[0].slice(0, 30)).join(' | ')}`);
      console.log(`  svg=${await page.locator('.ldh-pane.is-active svg').count()} canvas=${await page.locator('.ldh-pane.is-active canvas').count()}`);
      const chart = page.locator('.ldh-pane.is-active svg').first();
      if (await chart.count()) console.log(`  first svg box: ${JSON.stringify(await chart.boundingBox())}`);
    }

    for (const path of ['/categories/beverages/', '/employees/2/', '/products/1/', '/customers/']) {
      await at(path);
      const links = page.locator('.ldh-pane.is-active button.tb-links').first();
      if (!(await links.count())) { console.log(`\n${path}  → no tb-links button`); continue; }
      await links.click();
      await page.waitForTimeout(3000);
      const pops = page.locator('[class*="links"]:visible').filter({ hasText: /BACKLINK/i });
      const text = (await pops.count()) ? (await pops.first().innerText()).replace(/\n+/g, ' / ').slice(0, 240) : '(none)';
      console.log(`\n${path}  → ${text}`);
    }

    await at('/orders/');
    for (const menu of ['Create', 'Actions']) {
      const btn = page.locator('.ldh-pane.is-active button.drop-toggle').filter({ hasText: menu }).first();
      if (!(await btn.count())) { console.log(`\n${menu}: no button`); continue; }
      await btn.click();
      await page.waitForTimeout(1200);
      const open = page.locator('ul:visible, .ac-menu:visible, .dropdown-menu:visible').filter({ hasText: /\w/ }).last();
      console.log(`\n${menu} menu: ${(await open.innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  },
}, {});
