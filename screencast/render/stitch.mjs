// Stitching a take's scroll into one tall still, so the camera can pan where the page
// jumped.
//
// A browser scroll on camera is a 300 ms glide — too fast for the eye to follow as a
// pan. But every frame of it shows the same page at a different offset, so the frames
// chain into one image of the page as tall as the scroll: each frame's offset against
// the previous is measured (the shift that makes their overlap agree), and each row of
// the result comes from the latest frame that shows it, which also drops the fixed chrome
// — the sticky bar and the floating button — that would otherwise repeat down the page.
// Rows the take shows after the scroll settled come from the frame the cut resumes on,
// so the still ends on the pixels the live footage begins with.
//
//   node render/stitch.mjs tracks/<take>.webm --from 19.4 --to 20.3 --resume 22.10 \
//     --chrome 115 --out tracks/<take>.scroll.png
//
// The cutter reads a `.png` track as a still: `from`/`to` in seconds are the pan's span.
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const from = Number(opt('from')), to = Number(opt('to')), resume = Number(opt('resume'));
const chrome = Number(opt('chrome', 115));
const out = opt('out', src.replace(/\.\w+$/, '.scroll.png'));
const W = Number(opt('width', 2880)), H = Number(opt('height', 1800));
const FPS = 25;

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    const chunks = []; let err = '';
    p.stdout.on('data', (d) => chunks.push(d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} failed\n${err.slice(-600)}`))));
    if (input) { p.stdin.end(input); }
  });
}
const frames = async (ss, t, pix, w, h) => {
  const buf = await run('ffmpeg', ['-loglevel', 'error', '-ss', String(ss), '-t', String(t), '-i', src, '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', pix, '-']);
  const size = w * h * (pix === 'gray' ? 1 : 3), n = Math.floor(buf.length / size);
  return Array.from({ length: n }, (_, i) => buf.subarray(i * size, (i + 1) * size));
};

// The shift between two gray frames: the dy that makes b's rows agree with a's rows dy
// further down, over the page area (chrome and the side gutters left out).
function shift(a, b, w, h, x0, x1, y0, y1, lo, hi) {
  let best = null;
  for (let dy = lo; dy <= hi; dy++) {
    const yEnd = y1 - dy; if (yEnd - y0 < h / 6) break;
    let sum = 0, n = 0;
    for (let y = y0; y < yEnd; y += 2) {
      const ra = (y + dy) * w, rb = y * w;
      for (let x = x0; x < x1; x += 2) { sum += Math.abs(a[ra + x] - b[rb + x]); n++; }
    }
    const err = sum / n;
    if (!best || err < best.err) best = { dy, err };
  }
  return best;
}

const S = 4, w4 = W / S, h4 = H / S;
const coarse = await frames(from, to - from, 'gray', w4, h4);
const fine = await frames(from, to - from, 'gray', W, H);
const offsets = [0];
for (let i = 0; i + 1 < coarse.length; i++) {
  const c = shift(coarse[i], coarse[i + 1], w4, h4, 75, 650, 62, 425, 0, 175);
  const f = shift(fine[i], fine[i + 1], W, H, 300, 2600, 250, 1700, Math.max(0, c.dy * S - S), c.dy * S + S);
  offsets.push(offsets[i] + f.dy);
  console.log(`  ${(from + i / FPS).toFixed(2)} → ${(from + (i + 1) / FPS).toFixed(2)}: ${f.dy} px (err ${f.err.toFixed(2)}), page offset ${offsets[i + 1]}`);
}
const total = offsets[offsets.length - 1];
const rgb = await frames(from, to - from, 'rgb24', W, H);
const [resumeFrame] = await frames(resume, 1 / FPS, 'rgb24', W, H);
const height = total + H;
const page = Buffer.alloc(W * height * 3);
for (let y = 0; y < height; y++) {
  // the frame the row comes from: the resume frame once it shows the row, else the
  // latest glide frame that does (chrome rows of a frame are never the page)
  let f = null, off = 0;
  if (y >= total + chrome) { f = resumeFrame; off = total; }
  else for (let i = offsets.length - 1; i >= 0; i--) if (y >= offsets[i] + (i ? chrome : 0) && y < offsets[i] + H) { f = rgb[i]; off = offsets[i]; break; }
  if (!f) continue;
  f.copy(page, y * W * 3, (y - off) * W * 3, (y - off + 1) * W * 3);
}
await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${height}`, '-i', '-', '-frames:v', '1', out], page);
await fs.writeFile(out.replace(/\.png$/, '.json'), JSON.stringify({ source: src, from, to, resume, chrome, scroll: total, width: W, height }, null, 2));
console.log(`→ ${out}  ${W}×${height}, the page scrolled ${total} px between ${from}s and ${to}s; rows from ${total + chrome} down are the frame at ${resume}s`);
