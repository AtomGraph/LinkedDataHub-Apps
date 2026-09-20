// Read-only: what /regions/4/ renders — blocks, views, add-instance buttons. Nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/regions/4/');
await runScene({ id: 'probe-region4', target: opts.target, identity: opts.identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    const t0 = Date.now();
    await page.goto(opts.target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 60_000 }).catch(() => {});
    await sleep(6000);
    console.log('  loaded in', Date.now() - t0, 'ms');
    console.log('  blocks:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].map((b) => ({ cls: b.getAttribute('data-for-class'), title: b.querySelector('h2, h3, .ldh-bh-title')?.textContent.trim().slice(0, 40), add: b.querySelectorAll('button.add-instance').length, toolbar: !!b.querySelector('.ldh-view-toolbar') })))));
    await page.screenshot({ path: process.env.SHOTS + '/region4.png', fullPage: true });
  } });
