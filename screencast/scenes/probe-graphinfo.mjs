import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { foreignNode, zoomToFit } from '../lib/graph.mjs';

const opts = await resolve('/');
const ORDER = '11074';
const GRAPH_MODE = 'https://w3id.org/atomgraph/client#GraphMode';
const OPENS_ON = `${opts.base}/orders/${ORDER}/?mode=${encodeURIComponent(GRAPH_MODE)}`;

await runScene({
  id: 'probe-graphinfo', target: OPENS_ON, identity: opts.identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor }) {
    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 25_000 }).catch(() => {});
    await sleep(4000);
    await zoomToFit(page, cursor);
    await sleep(1500);

    console.log('  info panels in DOM:', await page.evaluate(() =>
      [...document.querySelectorAll('[id^="info-content-"]')].map((e) =>
        `id=${e.id} visible=${e.offsetParent !== null} html=${e.innerHTML.slice(0, 120)}`).join('\n    ') || '(none)'));

    const n = await foreignNode(page, `${opts.base}/orders/${ORDER}/`, { skip: 0, prefer: /\/(customers|employees|shippers)\// });
    console.log('  node:', JSON.stringify(n));
    if (!n || n.error) return;

    await cursor.moveTo(n.x, n.y, { duration: 360 });
    await sleep(260);
    await page.mouse.click(n.x, n.y);
    await sleep(2500);

    console.log('  after click:', await page.evaluate(() =>
      [...document.querySelectorAll('[id^="info-content-"]')].map((e) =>
        `id=${e.id} visible=${e.offsetParent !== null}\n      html=${e.innerHTML.replace(/\s+/g, ' ').slice(0, 300)}`).join('\n    ') || '(none)'));
    console.log('  anchors:', await page.evaluate(() =>
      [...document.querySelectorAll('[id^="info-content-"] a')].map((a) =>
        `href=${a.getAttribute('href')} visible=${a.offsetParent !== null} text=${a.innerText.slice(0, 40)}`).join('\n    ') || '(none)'));
  },
}, {});
