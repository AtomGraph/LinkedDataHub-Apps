// Read-only: the graph mode's chrome around the canvas (legend, zoom-to-fit, hint,
// fullscreen) as a template, plus the page head in Graph mode.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const p = await ctx.newPage();
await p.goto(`${base}/orders/10423/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`, { waitUntil: 'load' });
await p.waitForSelector('canvas', { timeout: 30_000 }); await p.waitForTimeout(5000);
const out = await p.evaluate(() => {
  const canvas = document.querySelector('canvas');
  let host = canvas; while (host && !/graph/i.test(host.className) && host.parentElement) host = host.parentElement;
  const clone = host.cloneNode(true);
  clone.querySelectorAll('canvas').forEach((c) => { const d = document.createElement('div'); d.setAttribute('data-slot', 'canvas'); d.setAttribute('style', `width:${c.clientWidth}px;height:${c.clientHeight}px`); c.replaceWith(d); });
  clone.querySelectorAll('script').forEach((s) => s.remove());
  clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  const r = host.getBoundingClientRect(); const cr = canvas.getBoundingClientRect();
  return { html: clone.outerHTML, cls: host.className, box: { x: r.x, y: r.y, w: r.width, h: r.height }, canvas: { x: cr.x, y: cr.y, w: cr.width, h: cr.height }, header: document.querySelector('.ldh-header')?.outerHTML.replace(/ id="[^"]*"/g, '') ?? '', toolbar: document.querySelector('.ldh-doc-toolbar, .ldh-topbar, [class*="doc-bar"]')?.outerHTML.replace(/ id="[^"]*"/g, '') ?? '' };
});
await fs.writeFile('mock/templates/graph-host.html', out.html);
await fs.writeFile('mock/templates/app-header.html', out.header + '\n' + out.toolbar);
console.log(`  host .${out.cls} ${JSON.stringify(out.box)} canvas ${JSON.stringify(out.canvas)}; header ${out.header.length} chars, toolbar ${out.toolbar.length}`);
console.log('  host html:', out.html.replace(/\s+/g, ' ').slice(0, 700));
await b.close();
