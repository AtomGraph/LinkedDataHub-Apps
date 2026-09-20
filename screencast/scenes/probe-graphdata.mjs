// Read-only: the graph's nodes and links as data, and the app's node colouring, so the
// bloom can be drawn rather than recorded.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const p = await ctx.newPage();
await p.goto(`${base}/orders/10423/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`, { waitUntil: 'load' });
await p.waitForSelector('canvas', { timeout: 30_000 }); await p.waitForTimeout(6000);
const data = await p.evaluate(() => {
  const gs = window.LinkedDataHub?.graphs ?? {}; const g = Object.values(gs).at(-1); const fg = g.instance ?? g;
  const d = fg.graphData();
  const color = fg.nodeColor?.(); const nodeColor = typeof color === 'function' ? color : null;
  return { nodes: d.nodes.map((n) => ({ id: String(n.id), label: n.label ?? n.name ?? '', color: nodeColor ? nodeColor(n) : (n.color ?? null), val: n.val ?? 1, type: n.type ?? n.types ?? null })), links: d.links.map((l) => ({ s: String(l.source.id ?? l.source), t: String(l.target.id ?? l.target), label: l.label ?? '' })), canvas: getComputedStyle(document.querySelector('canvas').parentElement).backgroundColor, bg: fg.backgroundColor?.() };
});
await fs.writeFile('mock/assets/graph-order.json', JSON.stringify(data, null, 1));
const chrome = await p.evaluate(() => { const c = document.querySelector('canvas').closest('.graph-3d-host, .ldh-block, .container-results'); return c ? { cls: c.className, html: c.outerHTML.replace(/<canvas[\s\S]*?<\/canvas>/, '<canvas></canvas>').slice(0, 3000) } : null; });
console.log(`  ${data.nodes.length} nodes, ${data.links.length} links; bg ${data.bg} / ${data.canvas}`);
console.log('  colours:', JSON.stringify([...new Set(data.nodes.map((n) => n.color))].slice(0, 8)));
console.log('  sample:', JSON.stringify(data.nodes.slice(0, 4)));
console.log('  chrome:', chrome?.cls, (chrome?.html ?? '').slice(0, 600).replace(/\s+/g, ' '));
await b.close();
