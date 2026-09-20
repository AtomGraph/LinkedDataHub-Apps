// Read-only: the employees view in Graph mode, as the app lays it out — nodes with their
// projected screen positions, colours and sizes, and the links — for the mock to draw.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const p = await ctx.newPage();
await p.goto(`${base}/employees/`, { waitUntil: 'load' }); await p.waitForSelector('.ldh-pane.is-active .ldh-view-toolbar', { timeout: 30_000 }); await p.waitForTimeout(3000);
await p.locator('.ldh-pane.is-active .ldh-view-toolbar .ldh-mode .drop-toggle').first().click(); await p.waitForTimeout(500);
await p.locator('.ldh-pane.is-active .ldh-view-toolbar .ldh-mode .modes-pop.view-mode-list button.mi.graph-mode').first().click();
await p.waitForSelector('.ldh-pane.is-active canvas', { timeout: 30_000 }); await p.waitForTimeout(9000);
const fit = p.locator('.ldh-pane.is-active button, .ldh-pane.is-active .ac-btn').filter({ hasText: /Zoom to fit/i }).first(); if (await fit.count()) { await fit.click(); await p.waitForTimeout(3000); }
const data = await p.evaluate(() => {
  const gs = window.LinkedDataHub?.graphs ?? {}; const live = Object.entries(gs).filter(([id]) => document.getElementById(id)?.offsetParent !== null); const g = (live.length ? live : Object.entries(gs)).at(-1)[1]; const fg = g.instance ?? g;
  const canvas = document.querySelector('.ldh-pane.is-active canvas').getBoundingClientRect();
  const d = fg.graphData(); const cam = fg.camera().position;
  const nodes = d.nodes.map((n) => { const s = fg.graph2ScreenCoords(n.x, n.y, n.z); const dist = Math.hypot(n.x - cam.x, n.y - cam.y, n.z - cam.z); return { id: String(n.id), label: n.label ?? '', color: n.color ?? null, val: n.val ?? 1, x: s.x, y: s.y, depth: dist }; });
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  const links = d.links.map((l) => ({ s: idx[String(l.source.id ?? l.source)], t: idx[String(l.target.id ?? l.target)] })).filter((l) => l.s != null && l.t != null);
  return { canvas: { w: canvas.width, h: canvas.height }, nodes, links, relSize: fg.nodeRelSize?.(), linkWidth: fg.linkWidth?.() };
});
await fs.writeFile('mock/assets/graph-employees.json', JSON.stringify(data));
const ds = data.nodes.map((n) => n.depth); console.log(`  ${data.nodes.length} nodes, ${data.links.length} links; canvas ${data.canvas.w}×${data.canvas.h}; depth ${Math.round(Math.min(...ds))}–${Math.round(Math.max(...ds))}; relSize ${data.relSize}`);
await p.screenshot({ path: 'mock/assets/graph-employees-ref.png' });
await b.close();
