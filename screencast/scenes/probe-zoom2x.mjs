// Read-only: does a 2880×1800 viewport with the document zoomed 200 % still drive?
// (The video is the viewport in CSS pixels, so this is how 2× footage is had.)
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
const opts = await resolve('/employees/2/');
const { identity, target } = opts;
await runScene({ id: 'probe-zoom2x', target, identity, geometry: geometryFrom(opts, { width: 2880, height: 1800, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2'; }); });
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active button.add-instance', { timeout: 30_000 }); await sleep(3000);
    const btn = ui(page).locator('.ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first().locator('button.add-instance').first();
    await btn.scrollIntoViewIfNeeded();
    const bb = await btn.boundingBox();
    console.log('  create button box:', JSON.stringify(bb), 'zoom:', await page.evaluate(() => document.documentElement.style.zoom), 'innerWidth:', await page.evaluate(() => innerWidth));
    await cursor.click(btn);
    const pm = page.locator('.modal-constructor:visible, .ac-modal:visible').last();
    const ok = await pm.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
    console.log('  modal opened by cursor click:', ok, ok ? JSON.stringify(await pm.boundingBox()) : '');
    await page.screenshot({ path: '/private/tmp/claude-501/-Users-martynas-WebRoot-LinkedDataHub/5542c912-918c-4be9-8864-ed41b61b33fa/scratchpad/sc/zoom2x.png' });
    await page.keyboard.press('Escape');
  } });
