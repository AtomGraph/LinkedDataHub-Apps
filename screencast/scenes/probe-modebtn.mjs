import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
const { target, identity, ...a } = await resolve('/categories/');
await runScene({
  id: 'probe-modebtn', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, shot }) {
    await page.waitForTimeout(9000);
    console.log('\nurl:', page.url());
    console.log('\npanes:', await page.evaluate(() => [...document.querySelectorAll('[class*="pane"]')].map((e) => e.className).join(' | ') || '(none)'));
    console.log('\nall visible buttons:', await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
        .map((b) => b.className.split(' ').slice(0, 4).join('.') + '{' + b.textContent.trim().replace(/\s+/g, ' ').slice(0, 18) + '}').slice(0, 30).join('\n  ') || '(none)'));
    console.log('\nbody text head:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
    await shot('state');
  },
}, {});
