// The front page's hero loop, cut from the supercut master.
//
// The master (tracks/supercut.mp4) is assembled from per-shot files that carry their
// own burned-in captions and the browser chrome, and the shot list that built it is
// not in the repo. So the loop is derived rather than rebuilt: the chrome strip is
// cropped off the top and the old caption strip off the bottom, the stretches named
// in `cuts` are dropped, and new captions are laid over what remains.
//
// The captions are the point of the file. They live in hero.json as text, timed on
// the MASTER's timeline so a cut can move without retiming every line; this script
// remaps them. Each one is rendered in the browser, in the platform's own Geist, and
// overlaid with ffmpeg — this ffmpeg has no drawtext and no libass, and a browser is
// the one text rasteriser the rig already depends on. The rule the captions follow:
// name the LinkedDataHub feature on screen, never the demo's subject matter.
//
//   node render/hero.mjs [hero.json]
//
// Writes the loop, a poster frame, and a contact sheet beside it for a once-over.

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT } from '../lib/harness.mjs';

const specFile = path.resolve(process.argv[2] ?? path.join(ROOT, 'hero.json'));
const spec = JSON.parse(await fs.readFile(specFile, 'utf8'));
const at = (p) => path.resolve(ROOT, p);

const run = (cmd, args) => new Promise((resolve) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  child.on('close', (code) => resolve({ code, out, err }));
});

const probe = async (file) => {
  const r = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file]);
  const j = JSON.parse(r.out);
  return { duration: Number(j.format.duration), width: j.streams[0].width, height: j.streams[0].height };
};

const src = await probe(at(spec.source));
const cuts = (spec.cuts ?? []).map(([a, b]) => [Number(a), Number(b)]).sort((x, y) => x[0] - y[0]);

// Master time → loop time, or null inside a cut.
const remap = (t) => {
  let shift = 0;
  for (const [a, b] of cuts) {
    if (t <= a) break;
    if (t < b) return null;
    shift += b - a;
  }
  return t - shift;
};
const keptSpans = [];
{
  let pos = 0;
  for (const [a, b] of cuts) { if (a > pos) keptSpans.push([pos, a]); pos = b; }
  if (pos < src.duration) keptSpans.push([pos, src.duration]);
}

// A caption crossing a cut keeps whichever side of it is longer, if that is worth showing.
const captions = [];
for (const c of spec.captions) {
  const a = Number(c.in), b = Number(c.out);
  const cut = cuts.find(([x, y]) => a < y && b > x);
  if (!cut) { captions.push({ ...c, from: remap(a), to: remap(b) }); continue; }
  const [x, y] = cut;
  const left = Math.max(0, x - a), right = Math.max(0, b - y);
  if (left >= right && left > 0.5) captions.push({ ...c, from: remap(a), to: remap(x) });
  else if (right > 0.5) captions.push({ ...c, from: remap(y), to: remap(b) });
}

// Render the captions. Geist comes from the platform, as the site serves it, so the
// loop's type matches the page it sits on.
const fontFile = at('../../LinkedDataHub/src/main/webapp/static/com/atomgraph/linkeddatahub/css/fonts/geist.woff2');
const font = (await fs.readFile(fontFile)).toString('base64');
const capDir = at('tracks/.hero');
await fs.mkdir(capDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: spec.width, height: 200 }, deviceScaleFactor: 1 });
const { size, weight } = spec.caption;
for (const [i, c] of captions.entries()) {
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
    html, body { margin: 0; background: transparent; }
    .cap { display: inline-block; font: ${weight} ${size}px/1.25 Geist, system-ui, sans-serif; color: #fff;
           background: rgba(11, 14, 20, 0.67); border-radius: 10px; padding: 14px 22px; white-space: nowrap;
           -webkit-font-smoothing: antialiased; }
  </style><span class="cap">${c.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`);
  await page.evaluate(() => document.fonts.ready);
  c.png = path.join(capDir, `${String(i).padStart(2, '0')}.png`);
  await page.locator('.cap').screenshot({ path: c.png, omitBackground: true });
}
await browser.close();

// One ffmpeg pass: crop, cut, concat, overlay each caption for its span.
const { top, bottom } = spec.crop;
const parts = [`[0]crop=iw:ih-${top + bottom}:0:${top},scale=${spec.width}:-2,split=${keptSpans.length}${keptSpans.map((_, i) => `[s${i}]`).join('')}`];
keptSpans.forEach(([a, b], i) => parts.push(`[s${i}]trim=${a}:${b},setpts=PTS-STARTPTS[p${i}]`));
parts.push(`${keptSpans.map((_, i) => `[p${i}]`).join('')}concat=n=${keptSpans.length}:v=1:a=0[v0]`);
let prev = 'v0';
captions.forEach((c, i) => {
  const { inset, bottom: rise } = spec.caption;
  parts.push(`[${prev}][${i + 1}]overlay=${inset}:H-h-${rise}:enable='between(t,${c.from.toFixed(3)},${c.to.toFixed(3)})'[v${i + 1}]`);
  prev = `v${i + 1}`;
});

const out = at(spec.output);
const enc = await run('ffmpeg', [
  '-v', 'error', '-y', '-i', at(spec.source), ...captions.flatMap((c) => ['-i', c.png]),
  '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(spec.crf ?? 24), '-pix_fmt', 'yuv420p', '-r', '30',
  '-movflags', '+faststart', out,
]);
if (enc.code !== 0) { console.error(enc.err); process.exit(1); }

await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(spec.posterAt ?? 0), '-i', out, '-frames:v', '1', '-q:v', '3', at(spec.poster)]);
await run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', 'fps=1/6,scale=426:-2,tile=5x3', '-frames:v', '1', '-update', '1', out.replace(/\.mp4$/, '-sheet.jpg')]);

const made = await probe(out);
const bytes = (await fs.stat(out)).size;
console.log(`${path.relative(ROOT, out)}  ${made.width}x${made.height}  ${made.duration.toFixed(1)}s  ${(bytes / 1e6).toFixed(1)} MB  ${captions.length} captions`);
for (const c of captions) console.log(`  ${c.from.toFixed(1).padStart(5)}–${c.to.toFixed(1).padEnd(5)} ${c.text}`);
