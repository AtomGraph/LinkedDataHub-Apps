// Does a real pointer drag reorder a block, and does the drop marker show while it hangs?
//
// The compose scene moves a block by dispatching the app's DragEvents itself, because
// pointer drags "never reached the handler". This probe tries the pointer again, with
// what Chromium's drag emulation needs: mousedown on the draggable handle, a first
// small move to cross the drag threshold, then the travel in steps, a hold over the
// target, and the release. It samples the target row for the app's `drag-over` class
// on every step, photographs the hold, and reads the block order back before and after.
//
//   node scenes/probe-drag-native.mjs --base … --cert-file … --cert-password-file … --ldh …
//
// Read-only for the demo: it writes into its own scratch document, drag-probe, which
// it creates and deletes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { resolve, ROOT, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { contentModeUrl } from '../lib/blocks.mjs';
import { spawn } from 'node:child_process';

const opts = await resolve('/');
const { base, identity } = opts;
const password = opts.certPassword ?? (await fs.readFile(opts.certPasswordFile, 'utf8')).trim();
const run = (cmd, args, input = null) => new Promise((res) => {
  const p = spawn(cmd, args); if (input !== null) { p.stdin.write(input); p.stdin.end(); }
  let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => res({ code, out: out.trim(), err: err.trim() }));
});

const url = `${base}/drag-probe/`;
const ttl = `@prefix dh: <https://w3id.org/atomgraph/linkeddatahub/document-hierarchy#> .
@prefix ldh: <https://w3id.org/atomgraph/linkeddatahub#> .
@prefix sioc: <http://rdfs.org/sioc/ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<> a dh:Item ; sioc:has_container <${base}/> ; dct:title "Drag probe" ; rdf:_1 <#a> ; rdf:_2 <#b> .
<#a> a ldh:XHTML ; rdf:value """<div xmlns="http://www.w3.org/1999/xhtml"><p>Block A. Eastern has four reps on nineteen territories.</p></div>"""^^rdf:XMLLiteral .
<#b> a ldh:XHTML ; rdf:value """<div xmlns="http://www.w3.org/1999/xhtml"><p>Block B. Southern has two on eight.</p></div>"""^^rdf:XMLLiteral .
`;
const put = await run(opts.ldh, ['put', '-c', opts.certFile, '-p', password, '--content-type', 'text/turtle', url], ttl);
if (put.code !== 0) { console.error('put failed:', put.err.split(password).join('••••').slice(0, 500)); process.exit(1); }
console.log('scratch document:', url);

const outDir = path.join(ROOT, 'tracks', '.probe'); await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: !opts.headed });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, ...(identity ? { clientCertificates: identity } : {}) });
// the first-time message modal is dismissed by a cookie, as the harness does
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
page.on('response', (r) => { if (r.request().method() === 'GET' && r.url().startsWith(url)) console.log('  GET', r.status(), r.url().slice(url.length, url.length + 40), 'ETag:', r.headers()['etag'], r.headers()['x-cache'] ?? r.headers()['age'] ?? ''); });
await page.goto(contentModeUrl(url), { waitUntil: 'load' });
await page.locator('.ldh-block-row').first().waitFor({ timeout: 30_000 });
await sleep(5000);

const order = () => page.evaluate(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row[about]')].map((r) => r.getAttribute('about').split('#')[1]));
const overs = () => page.evaluate(() => [...document.querySelectorAll('.ldh-block-row.drag-over')].map((r) => r.getAttribute('about').split('#')[1]));
const rows = ui(page).locator('.ldh-block-row');
const from = rows.first(), to = rows.nth(1);
console.log('order before:', await order());

await from.hover(); await sleep(400);
const handle = from.locator('span.ldh-bh-drag').first();
if (!(await handle.count())) { console.log('no drag handle rendered — not in content mode with write access?'); await browser.close(); process.exit(1); }
const hb = await handle.boundingBox(); const tb = await to.locator('.ldh-block').first().boundingBox();
console.log('handle', hb, 'target', tb, 'draggable on row:', await from.getAttribute('draggable'));
const hx = hb.x + hb.width / 2, hy = hb.y + hb.height / 2;
const tx = tb.x + 120, ty = tb.y + Math.min(60, tb.height / 2);

await page.mouse.move(hx, hy); await sleep(200);
await page.mouse.down(); await sleep(150);
await page.mouse.move(hx + 4, hy + 4); await sleep(100);      // cross the drag threshold
await page.mouse.move(hx + 12, hy + 12); await sleep(100);
const seen = new Set();
const steps = 24;
for (let i = 1; i <= steps; i++) {
  await page.mouse.move(hx + (tx - hx) * i / steps, hy + (ty - hy) * i / steps);
  await sleep(40);
  for (const o of await overs()) seen.add(o);
}
await sleep(700);
for (const o of await overs()) seen.add(o);
await page.screenshot({ path: path.join(outDir, 'drag-hold.png') });
console.log('drag-over seen during travel/hold:', [...seen]);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  page', m.type() + ':', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 200)));
let patchBody = null, patchHeaders = null;
page.on('request', (r) => { if (['PUT', 'POST', 'PATCH'].includes(r.method())) { console.log('  ', r.method(), r.url(), 'If-Match:', r.headers()['if-match'], 'Accept:', r.headers()['accept'], 'Content-Type:', r.headers()['content-type']); if (r.method() === 'PATCH') { patchBody = r.postData(); patchHeaders = r.headers(); } } });
page.on('response', (r) => { if (['PUT', 'POST', 'PATCH'].includes(r.request().method())) console.log('  ', r.status(), r.request().method(), r.url()); });
await page.mouse.up();
const changed = await page.waitForFunction(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block-row[about]')].map((r) => r.getAttribute('about').split('#')[1]).join() !== 'a,b', null, { timeout: 10_000 }).then(() => true, () => false);
console.log('order after pointer drag:', await order(), changed ? '(changed)' : '(unchanged after 10s)');

if (JSON.stringify(await order()) === JSON.stringify(['a', 'b'])) {
  console.log('pointer drag did not reorder; trying locator.dragTo');
  await handle.dragTo(to.locator('.ldh-block').first(), { targetPosition: { x: 120, y: 60 } }).catch((e) => console.log('dragTo threw:', e.message.split('\n')[0]));
  await sleep(1500);
  console.log('order after dragTo:', await order());
}
await page.screenshot({ path: path.join(outDir, 'drag-after.png') });
// Replay the app's own PATCH with every pairing of the representation whose ETag is sent
// and the Accept the write carries, to see which pairing the server honours.
if (patchBody) {
  console.log('patch body:', patchBody.replace(/\s+/g, ' ').slice(0, 300));
  const accepts = ['text/turtle', 'text/html', 'application/rdf+xml', '*/*'];
  const etags = {};
  for (const a of accepts) { const r = await page.request.get(url, { headers: { Accept: a } }); etags[a] = r.headers()['etag']; }
  console.log('etags:', etags);
  for (const tagOf of accepts) for (const acc of ['text/turtle', '*/*', patchHeaders['accept'] ?? '*/*']) {
    const r = await page.request.fetch(url, { method: 'PATCH', headers: { 'If-Match': etags[tagOf], Accept: acc, 'Content-Type': patchHeaders['content-type'] }, data: patchBody });
    console.log(`  If-Match from ${tagOf.padEnd(19)} Accept ${acc.padEnd(60)} → ${r.status()}`);
  }
  const r = await page.request.fetch(url, { method: 'PATCH', headers: { Accept: '*/*', 'Content-Type': patchHeaders['content-type'] }, data: patchBody });
  console.log(`  no If-Match → ${r.status()}`);
}
await browser.close();
const del = await run(opts.ldh, ['delete', url, '-c', opts.certFile, '-p', password]);
console.log('scratch removed:', del.code === 0);
