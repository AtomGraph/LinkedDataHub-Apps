import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import * as modes from '../lib/modes.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';

const { target, identity, ...a } = await resolve('/orders/10265/');

await runScene({
  id: 'probe-graph', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, target, shot, sleep }) {
    await page.goto(target, { waitUntil: 'load' });
    await sleep(8000);

    // An order is an item, not a container: it carries no view block, so the graph
    // is the DOCUMENT-scope one — which renders what this document describes, and for
    // an order that is the transaction and everyone in it.
    console.log('  → document graph:', await switchDocumentMode(page, cursor, 'graph-mode', { settle: 2000 }));
    await sleep(6000);
    console.log('  canvas:', await page.locator('canvas').count());

    // the graph instance keeps its own node list; screen coords come from it
    const nodes = await page.evaluate(() => {
      const gs = window.LinkedDataHub?.graphs ?? {};
      const key = Object.keys(gs)[0];
      const g = gs[key];
      if (!g) return { error: 'no graph instance' };
      const api = Object.getOwnPropertyNames(Object.getPrototypeOf(g) || {}).slice(0, 14);
      const fg = g.instance ?? g;
      let data = null;
      try { data = fg.graphData(); } catch (e) { return { error: e.message, keys: Object.keys(g) }; }
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      return {
        count: data.nodes.length,
        links: data.links.length,
        loaded: (g['loaded-uris'] || []).length,
        canvas: `${Math.round(canvas.x)},${Math.round(canvas.y)} ${Math.round(canvas.width)}x${Math.round(canvas.height)}`,
        sample: data.nodes.slice(0, 6).map((n) => {
          let p = null;
          try { p = fg.graph2ScreenCoords(n.x, n.y, n.z); } catch {}
          return `${String(n.id ?? '').split('/').filter(Boolean).pop().slice(0, 22)} @ ${p ? Math.round(canvas.x + p.x) + ',' + Math.round(canvas.y + p.y) : '?'}`;
        }),
      };
    });
    console.log('  nodes:', nodes.count, 'links:', nodes.links, 'canvas', nodes.canvas);

    // pick a node belonging to ANOTHER document — expanding it is what crosses the
    // document boundary, which is the whole claim
    const pick = await page.evaluate((base) => {
      const g = Object.values(window.LinkedDataHub.graphs)[0];
      const fg = g.instance ?? g;
      const { nodes } = fg.graphData();
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const here = base + '/orders/10265/';
      const foreign = nodes.filter((n) => String(n.id).startsWith('http') && !String(n.id).startsWith(here));
      const n = foreign[0] ?? nodes[0];
      const p = fg.graph2ScreenCoords(n.x, n.y, n.z);
      return { id: String(n.id), x: Math.round(canvas.x + p.x), y: Math.round(canvas.y + p.y), foreign: foreign.length };
    }, 'https://northwind-traders.demo.localhost');
    console.log('  foreign nodes:', pick.foreign, '— expanding', pick.id.slice(-42), 'at', pick.x + ',' + pick.y);

    const before = nodes.count;
    const panel = () => page.locator('.ldh-pane.is-active').innerText()
      .then((t) => t.split('\n').find((l) => /Click a node|details/i.test(l)) ?? '(no hint line)');

    // single click first: if it shows details, the pointer is genuinely over a node
    // and only the expansion differs
    await cursor.moveTo(pick.x, pick.y, { duration: 700 });
    await sleep(900);
    await page.mouse.click(pick.x, pick.y);
    await sleep(2500);
    console.log('  after single click:', await panel());

    await page.mouse.dblclick(pick.x, pick.y, { delay: 90 });
    await sleep(6000);

    const after = await page.evaluate(() => {
      const g = Object.values(window.LinkedDataHub.graphs)[0];
      const fg = g.instance ?? g;
      const d = fg.graphData();
      return { nodes: d.nodes.length, links: d.links.length, loaded: (g['loaded-uris'] || []).length };
    });
    console.log(`  after double-click: ${before} → ${after.nodes} nodes, ${nodes.links} → ${after.links} links, loaded-uris ${after.loaded}`);
    await shot('graph');
  },
}, {});
