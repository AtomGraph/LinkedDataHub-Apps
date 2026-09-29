// Not a scene. What the view blocks actually carry: data-for-class, data-inverse,
// the add-instance button, and the bound query — Northwind vs the UNESCO page that
// showed a Create button in scene 04.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { identity } = opts;
const PAGES = [
  'https://northwind-traders.demo.localhost/territories/75234/',
  'https://northwind-traders.demo.localhost/territories/78759/',
  'https://northwind-traders.demo.localhost/employees/2/',
  'https://northwind-traders.demo.localhost/categories/1/',
  'https://northwind-traders.demo.localhost/suppliers/1/',
  'https://northwind-traders.demo.localhost/customers/ALFKI/',
  'https://northwind-traders.demo.localhost/regions/4/',
];
await runScene({
  id: 'probe-viewclass', target: PAGES[0], identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    for (const p of PAGES) {
      await page.goto(p, { waitUntil: 'load' });
      await page.waitForSelector('.ldh-block, .ldh-view-toolbar', { timeout: 25_000 }).catch(() => {});
      await sleep(5000);
      console.log(`  ${p.replace('https://','')}`);
      console.log(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active div.block[about]')]
        .filter((b) => b.querySelector('.ldh-view-toolbar') || b.dataset.forClass || b.dataset.inverse)
        .map((b) => `    view=${(b.getAttribute('about')||'').split('/').pop().slice(0,40)} forClass=${b.dataset.forClass ?? '-'} inverse=${b.dataset.inverse ?? '-'} addInstance=${!!b.querySelector('button.add-instance')} title=${(b.querySelector('h2,h3,.ldh-res-head')?.innerText||'').trim().slice(0,28)}`)
        .join('\n') || '    (no view blocks)'));
    }
  },
}, {});
