// Read-only: the UNESCO thesaurus's tree (drawer) and its parallax concept columns.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { openTree } from '../lib/nav.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-unesco', target: base + '/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }); await sleep(4000);
    console.log('  root blocks:', JSON.stringify(await page.locator('.ldh-pane.is-active h2, .ldh-pane.is-active h3').allTextContents()));
    console.log('  parallax/tree-ish:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active [class*="parallax"], .ldh-pane.is-active [class*="column"], .ldh-pane.is-active [class*="tree"], .ldh-pane.is-active [class*="skos"], .ldh-pane.is-active .ldh-block[data-for-class]')].map((e) => e.tagName + '.' + e.className.slice(0, 50)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12))));
    await openTree(page, cursor);
    console.log('  drawer tree top:', JSON.stringify((await page.locator('.ldh-pane.is-active .tree-link, .left-sidebar a').allTextContents()).map((t) => t.trim()).filter(Boolean).slice(0, 12)));
    for (const p of ['/concepts/', '/schemes/']) {
      await page.goto(base + p, { waitUntil: 'load' }).catch(() => {});
      await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }).catch(() => {}); await sleep(3500);
      console.log(`  ${p}:`, await page.title(), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active [class*="parallax"], .ldh-pane.is-active [class*="column"], .ldh-pane.is-active [class*="tree"]')].map((e) => e.tagName + '.' + e.className.slice(0, 60)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8))));
    }
  } });
