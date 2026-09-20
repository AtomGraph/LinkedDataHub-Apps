// Block reorder through the DOM's own drag events (a DataTransfer carrying the app's
// block type) — Playwright's pointer drags never reached the handler. A success
// PATCHes the order (test-run state).
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { contentModeUrl } from '../lib/blocks.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const [pg] = await sparql(base, `PREFIX dct: <http://purl.org/dc/terms/> SELECT ?doc WHERE { GRAPH ?doc { ?doc dct:title "One rep for the South" } } LIMIT 1`);
await runScene({ id: 'probe-dnd-events', target: pg.doc, identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    await page.goto(contentModeUrl(pg.doc), { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active span.ldh-bh-drag', { state: 'attached', timeout: 30_000 }); await sleep(4000);
    const r = await page.evaluate(async () => {
      const rows = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')].filter((r) => r.querySelector('span.ldh-bh-drag'));
      const before = rows.map((r) => r.getAttribute('about'));
      const src = rows[0], dst = rows[rows.length - 1];
      const handle = src.querySelector('span.ldh-bh-drag');
      const dt = new DataTransfer();
      const fire = (type, target, extra = {}) => { const r = target.getBoundingClientRect(); const e = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.top + 10, ...extra }); target.dispatchEvent(e); return e.defaultPrevented; };
      fire('dragstart', handle);
      const types = [...dt.types];
      const inner = dst.querySelector('.ldh-block') || dst;
      const enter = fire('dragenter', inner); await new Promise((r) => setTimeout(r, 100)); const over = fire('dragover', inner); await new Promise((r) => setTimeout(r, 100));
      const marked = dst.className;
      const drop = fire('drop', inner); fire('dragend', handle);
      await new Promise((r) => setTimeout(r, 3000));
      const after = [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row')].filter((r) => r.querySelector('span.ldh-bh-drag')).map((r) => r.getAttribute('about'));
      return { types, enter, over, marked, drop, before: before.map((a) => a?.slice(-6)), after: after.map((a) => a?.slice(-6)), changed: JSON.stringify(before) !== JSON.stringify(after) };
    });
    console.log('  dnd:', JSON.stringify(r));
  } });
