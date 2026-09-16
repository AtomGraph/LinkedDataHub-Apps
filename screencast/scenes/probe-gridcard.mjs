// Read-only: how a grid card links to its resource.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/categories/');
const { identity, target } = opts;
await runScene({ id: 'probe-gridcard', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block-body img[src*="/uploads/"]', { timeout: 25_000 }).catch(() => {});
    await sleep(4000);
    const links = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-body a')].filter((a) => /categories\/1\//.test(a.getAttribute('href') || '') || /Beverages/.test(a.textContent)).map((a) => ({ href: a.getAttribute('href'), title: a.getAttribute('title'), text: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), cls: a.className, inner: a.innerHTML.slice(0, 80) })));
    console.log('  links:', JSON.stringify(links));
    console.log('  card:', JSON.stringify(await page.evaluate(() => { const img = document.querySelector('.ldh-pane.is-active .ldh-block-body img[src*="/uploads/"]'); let e = img; for (let i = 0; i < 4 && e; i++) e = e.parentElement; return e ? e.outerHTML.slice(0, 700) : null; })));
  } });
