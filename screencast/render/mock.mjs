// Rendering a vector mock: the player page is stepped frame by frame (window.render(t))
// and screenshotted at 2×, then encoded. No screen recording, no cursor, any resolution.
//   node render/mock.mjs mock/player.html tracks/mock-form-pin.mp4 [--scale 2] [--fps 30]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const [src, out] = process.argv.slice(2);
const opt = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const scale = opt('scale', 2), fps = opt('fps', 30);
const dir = path.join('tracks', '.mock'); await fs.rm(dir, { recursive: true, force: true }); await fs.mkdir(dir, { recursive: true });
// file:// pages cannot fetch their assets; the mock directory is served locally.
import http from 'node:http';
const root = path.resolve(path.dirname(src));
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try { const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const data = await fs.readFile(f); res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('  page error:', e.message));
await page.goto(`http://127.0.0.1:${port}/${path.basename(src)}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30_000 });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.duration);
const n = Math.ceil(duration * fps);
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.render(t), i / fps);
  await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`), type: 'png' });
  if (i % 30 === 0) process.stdout.write(`  ${i}/${n}\r`);
}
await browser.close(); server.close();
await new Promise((res, rej) => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.png'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed')))); });
console.log(`\n→ ${out}  ${duration}s, ${n} frames at ${1440 * scale}×${900 * scale}`);
