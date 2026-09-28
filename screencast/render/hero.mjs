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
// A `slide` in the spec closes the cut: the footage holds its last frame and fades into
// a title card set in the platform's own type and dark tokens — eyebrow, headline, lede,
// the addresses as pills — carrying the site's messaging rather than the demo's subject.
// It is rendered in the browser like the captions, at the output's exact frame size.
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
// The closing slide, at the output's frame size: the crop scaled to the spec width, the
// height rounded to even the way scale=W:-2 rounds it.
const { top, bottom } = spec.crop;
const outW = spec.width;
const outH = Math.round((src.height - top - bottom) * outW / src.width / 2) * 2;
let slidePng = null;
if (spec.slide) {
  const sl = spec.slide;
  const mono = (await fs.readFile(at('../../LinkedDataHub/src/main/webapp/static/com/atomgraph/linkeddatahub/css/fonts/geist-mono.woff2'))).toString('base64');
  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const k = outW / 1440; // type set for a 1440-wide frame, scaled with the output
  const px = (n) => `${(n * k).toFixed(2)}px`;
  const pills = (sl.links ?? []).map((l) => `<span class="pill${l.primary ? ' is-primary' : ''}">${esc(l.label)}</span>`).join('');
  const slidePage = await browser.newPage({ viewport: { width: outW, height: outH }, deviceScaleFactor: 1 });
  await slidePage.setContent(`<!doctype html><style>
    @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: 'Geist Mono'; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 100 900; }
    /* the platform's dark tokens: surface, on-surface, on-surface-variant, primary, tertiary, outline, aurora, dots */
    html, body { margin: 0; width: ${outW}px; height: ${outH}px; overflow: hidden; }
    body { position: relative; display: flex; align-items: center; justify-content: center; text-align: center;
           font-family: Geist, system-ui, sans-serif; color: #dde3ea; -webkit-font-smoothing: antialiased;
           background: #0f1419 linear-gradient(135deg, #241d3a 0%, #16263a 50%, #12291f 100%); }
    body::before { content: ""; position: absolute; inset: 0; opacity: 0.35; pointer-events: none;
           background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 1.4px); background-size: ${px(24)} ${px(24)}; }
    .card { position: relative; max-width: ${px(1060)}; padding: 0 ${px(48)}; display: flex; flex-direction: column; align-items: center; }
    .wordmark { display: inline-flex; align-items: center; gap: ${px(12)}; font-weight: 600; font-size: ${px(26)}; letter-spacing: -0.015em; color: #fff; margin-bottom: ${px(40)}; }
    .mark { width: ${px(36)}; height: ${px(36)}; border-radius: ${px(9)}; position: relative;
            background: linear-gradient(135deg, #4d94f8 0%, #ad7adf 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
    .mark::before, .mark::after { content: ""; position: absolute; border-radius: 50%; background: rgba(255,255,255,0.9); }
    .mark::before { width: ${px(9)}; height: ${px(9)}; top: ${px(6)}; left: ${px(6)}; }
    .mark::after  { width: ${px(6)}; height: ${px(6)}; bottom: ${px(7.5)}; right: ${px(7.5)}; }
    .eyebrow { font-family: 'Geist Mono', monospace; font-size: ${px(15)}; letter-spacing: 0.04em; text-transform: uppercase; color: #dbb3fd; margin: 0; }
    h1 { margin: ${px(14)} 0 ${px(22)}; font-size: ${px(76)}; font-weight: 600; line-height: 1.1; letter-spacing: -0.03em; color: #dde3ea; text-wrap: balance; }
    .lede { margin: 0; font-size: ${px(25)}; line-height: 1.45; color: #bcc8d5; max-width: ${px(880)}; text-wrap: balance; }
    .actions { display: flex; gap: ${px(14)}; margin-top: ${px(40)}; }
    .pill { display: inline-flex; align-items: center; height: ${px(54)}; padding: 0 ${px(26)}; border-radius: 999px; font-size: ${px(21)}; font-weight: 500;
            border: 1px solid #87929e; color: #dde3ea; white-space: nowrap; }
    .pill.is-primary { background: #98ccff linear-gradient(180deg, rgba(255,255,255,0.22), rgba(0,0,0,0.10)); color: #003259; border-color: transparent; }
    .note { font-family: 'Geist Mono', monospace; font-size: ${px(14)}; letter-spacing: 0.04em; text-transform: uppercase; color: #87929e; margin: ${px(36)} 0 0; }
  </style><div class="card">
    <div class="wordmark"><span class="mark"></span>LinkedDataHub</div>
    ${sl.eyebrow ? `<p class="eyebrow">${esc(sl.eyebrow)}</p>` : ''}
    <h1>${esc(sl.title)}</h1>
    ${sl.lede ? `<p class="lede">${esc(sl.lede)}</p>` : ''}
    ${pills ? `<div class="actions">${pills}</div>` : ''}
    ${sl.note ? `<p class="note">${esc(sl.note)}</p>` : ''}
  </div>`);
  await slidePage.evaluate(() => document.fonts.ready);
  slidePng = path.join(capDir, 'slide.png');
  await slidePage.screenshot({ path: slidePng });
}
await browser.close();

// One ffmpeg pass: crop, cut, concat, overlay each caption for its span.
const parts = [`[0]crop=iw:ih-${top + bottom}:0:${top},scale=${spec.width}:-2,split=${keptSpans.length}${keptSpans.map((_, i) => `[s${i}]`).join('')}`];
keptSpans.forEach(([a, b], i) => parts.push(`[s${i}]trim=${a}:${b},setpts=PTS-STARTPTS[p${i}]`));
parts.push(`${keptSpans.map((_, i) => `[p${i}]`).join('')}concat=n=${keptSpans.length}:v=1:a=0[v0]`);
let prev = 'v0';
// With a closing slide the footage holds its last frame for the fade and the card's
// hold. The hold goes on before the captions, so a caption's span ends where the
// footage ends rather than riding the held frame into the fade.
const loopLength = keptSpans.reduce((s, [a, b]) => s + (b - a), 0);
const slideFade = Number(spec.slide?.fade ?? 1.2), slideHold = Number(spec.slide?.seconds ?? 6);
if (slidePng) { parts.push(`[v0]tpad=stop_mode=clone:stop_duration=${(slideFade + slideHold).toFixed(3)}[v0h]`); prev = 'v0h'; }
captions.forEach((c, i) => {
  const { inset, bottom: rise } = spec.caption;
  parts.push(`[${prev}][${i + 1}]overlay=${inset}:H-h-${rise}:enable='between(t,${c.from.toFixed(3)},${c.to.toFixed(3)})'[v${i + 1}]`);
  prev = `v${i + 1}`;
});

// The closing slide: the card is a still input looped for the whole tail, its alpha faded
// in from the moment the footage ends, so nothing of it shows before then.
const slideInputs = [];
if (slidePng) {
  const idx = captions.length + 1;
  slideInputs.push('-loop', '1', '-framerate', '30', '-t', String(loopLength + slideFade + slideHold), '-i', slidePng);
  parts.push(`[${idx}]scale=${outW}:${outH},format=rgba,fade=t=in:st=${loopLength.toFixed(3)}:d=${slideFade}:alpha=1[sl]`);
  parts.push(`[${prev}][sl]overlay=0:0:format=auto[vs]`);
  prev = 'vs';
}

const out = at(spec.output);
const enc = await run('ffmpeg', [
  '-v', 'error', '-y', '-i', at(spec.source), ...captions.flatMap((c) => ['-i', c.png]), ...slideInputs,
  '-filter_complex', parts.join(';'), '-map', `[${prev}]`, '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(spec.crf ?? 24), '-pix_fmt', 'yuv420p', '-r', '30',
  '-movflags', '+faststart', out,
]);
if (enc.code !== 0) { console.error(enc.err); process.exit(1); }

await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(spec.posterAt ?? 0), '-i', out, '-frames:v', '1', '-q:v', '3', at(spec.poster)]);
await run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', 'fps=1/6,scale=426:-2,tile=5x3', '-frames:v', '1', '-update', '1', out.replace(/\.mp4$/, '-sheet.jpg')]);

const made = await probe(out);
const bytes = (await fs.stat(out)).size;
console.log(`${path.relative(ROOT, out)}  ${made.width}x${made.height}  ${made.duration.toFixed(1)}s  ${(bytes / 1e6).toFixed(1)} MB  ${captions.length} captions${slidePng ? `, closing slide from ${loopLength.toFixed(1)}s` : ''}`);
for (const c of captions) console.log(`  ${c.from.toFixed(1).padStart(5)}–${c.to.toFixed(1).padEnd(5)} ${c.text}`);
