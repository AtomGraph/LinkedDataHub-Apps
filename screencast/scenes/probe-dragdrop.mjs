// Read-only: the drag handle of a content block, what it dispatches, and what a page does
// with a dropped file. DOM inspection only; nothing saved.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const [pg] = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "One rep for the South" } }`);
await runScene({ id: 'probe-dragdrop', target: pg.doc, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(pg.doc, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block-row', { timeout: 25_000 }); await sleep(5000);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')].map((r, i) => ({ i, draggable: r.getAttribute('draggable'), cls: r.className.slice(0, 60), handle: [...r.querySelectorAll('[draggable="true"], .drag-handle, .btn-move, [class*="drag"], [class*="handle"]')].map((h) => h.tagName + '.' + h.className.slice(0, 50)).slice(0, 3), text: r.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) })));
    console.log('  rows:', JSON.stringify(rows));
    console.log('  drop zones:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active [class*="drop"], .ldh-pane.is-active [ondrop], [data-drop]')].map((e) => e.tagName + '.' + e.className.slice(0, 60)).slice(0, 8))));
    // handlers registered by Saxon-JS on the document? list ixsl event modes present in the SEF is not possible here; check which elements get dragstart listeners by dispatching a synthetic dragstart on the first row and reading dataTransfer set by handler
    const dt = await page.evaluate(() => {
      const r = document.querySelector('.ldh-pane.is-active .ldh-block-row');
      const src = r.querySelector('[draggable="true"]') || r;
      const dt = new DataTransfer();
      const ev = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt });
      src.dispatchEvent(ev);
      return { source: src.tagName + '.' + src.className.slice(0, 50), types: [...dt.types], data: dt.types.map((t) => t + '=' + dt.getData(t).slice(0, 80)) };
    });
    console.log('  dragstart on first row:', JSON.stringify(dt));
  } });
