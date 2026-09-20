// Read-only: the Southern region page's views and their toolbars' mode toggles.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/regions/4/');
await runScene({ id: 'probe-region-views', target: opts.target, identity: opts.identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(opts.target, { waitUntil: 'load' }); await page.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 40_000 }).catch(() => {}); await sleep(4000);
    console.log('  views:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].filter((b) => b.querySelector('.ldh-view-toolbar')).map((v) => ({ title: v.querySelector('h2,h3,.ldh-bh-title')?.textContent.trim().slice(0, 40), forClass: v.getAttribute('data-for-class'), count: v.querySelector('.ldh-view-toolbar .count')?.textContent.trim(), mode: v.querySelector('.ldh-view-toolbar .right .ldh-mode button.drop-toggle')?.textContent.replace(/expand_more/g, '').trim(), modes: [...v.querySelectorAll('.ldh-view-toolbar .ldh-mode .modes-pop button.mi')].map((b) => b.className.match(/\b\w+-mode\b/)?.[0]), add: !!v.querySelector('button.add-instance') })))));
  } });
