// Read-only: serves the vector mock's directory and opens a mock page in a browser, for
// looking at a shot before render/mock.mjs steps it frame by frame.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs/promises'; import path from 'node:path';
const root = path.resolve('mock');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' }; const server = http.createServer(async (req, res) => { try { const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); res.end(await fs.readFile(f)); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
await p.goto(`http://127.0.0.1:${port}/bloom.html`); await p.waitForFunction(() => window.ready === true, null, { timeout: 30_000 }).catch(() => {});
console.log('ready:', await p.evaluate(() => window.ready === true), 'errors:', errs.slice(0, 3));
await p.evaluate(() => window.render(2.4));
console.log(JSON.stringify(await p.evaluate(() => { const gs = [...document.querySelectorAll('#graph svg .nodes g')]; const pos = gs.map((g) => g.getAttribute('transform')); const rs = gs.map((g) => Number(g.querySelector('circle').getAttribute('r'))); const nan = pos.filter((t) => /NaN/.test(t)).length; const xs = pos.map((t) => Number(t.match(/\(([-\d.]+),/)?.[1])); return { nodes: gs.length, nan, visible: rs.filter((r) => r > 0).length, xmin: Math.min(...xs), xmax: Math.max(...xs), sample: pos.slice(0, 3), rsample: rs.slice(0, 5) }; })));
await b.close(); server.close();
