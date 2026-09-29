// Read-only: which derived views does a category page carry?
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/categories/1/');
const { identity, target } = opts;
await runScene({ id: 'probe-catviews', target, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-block', { timeout: 25_000 }).catch(() => {});
    await sleep(6000);
    const views = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block[data-for-class], .ldh-pane.is-active [data-inverse]')].map((b) => ({ cls: b.getAttribute('data-for-class'), inverse: b.hasAttribute('data-inverse'), title: b.querySelector('h2,h3,.ldh-block-title')?.textContent?.trim().slice(0, 40) })));
    console.log('  derived views:', JSON.stringify(views));
    console.log('  headings:', JSON.stringify(await page.locator('.ldh-pane.is-active h2, .ldh-pane.is-active h3').allTextContents()));
  } });
