// Cut the page load off the front.
//
// A scene now opens on the document whose loaded render IS its strongest frame — the
// map already plotted, the grid already photographed. What it cannot control is that
// the browser needs a beat to get there: the server shell paints immediately, then
// Saxon-JS runs the transform and OpenLayers draws, and for about a second and a half
// the recording shows an empty placeholder block. Warming the document off camera
// fixes the network half and not this half, because this half is CPU in the browser.
//
// So the load is trimmed, and nothing else is. This is NOT a cold open: no later beat
// is lifted to the front, no moment is shown out of order, the scene still begins
// exactly where it begins. The only frames removed are the ones before the opening
// state had finished painting — and where to cut is measured rather than chosen,
// because a scene fires its first beat the instant the view is ready.
//
//   node render/head.mjs tracks/02-where-we-have-nobody.mp4 [--lead 0.3]
//
// Options: --lead S (how much to keep before the first beat, default 0.3), --marks
// FILE, --out FILE, --crf N.

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const src = argv[0];
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
if (!src) { console.error('usage: head.mjs <track.mp4> [--lead S]'); process.exit(2); }

const base = src.replace(/\.mp4$/, '');
const marksFile = opt('marks', `${base}.paced.marks.json`);
const out = opt('out', src);
// Zero by default, and deliberately. A scene fires its first beat the instant its
// opening view has painted, so the beat timestamp IS the first good frame — backing
// off even 0.3s lands before the paint, and pacing has already compressed the static
// pre-render stretch, so a small lead in the paced timeline is a longer one in real
// time. One take opened on an empty placeholder block that way.
const lead = Number(opt('lead', 0));
const crf = opt('crf', '20');

const run = (cmd, a) => new Promise((res, rej) => {
  const p = spawn(cmd, a); let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-500)))));
});

const marks = JSON.parse(await fs.readFile(marksFile, 'utf8'));
const first = marks.beats?.[0];
if (!first) { console.error(`${path.basename(marksFile)} has no beats`); process.exit(2); }

const cut = Math.max(0, first.at - lead);
if (cut < 0.25) {
  console.log(`  ${path.basename(src)}  nothing to trim (first beat at ${first.at.toFixed(2)}s)`);
  process.exit(0);
}

const tmp = `${base}.__head.mp4`;
await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(cut), '-i', src,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', crf,
  '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', tmp]);
await fs.rename(tmp, out);

const shifted = {
  ...marks,
  head: { trimmed: Number(cut.toFixed(2)), lead },
  duration: Number((marks.duration - cut).toFixed(3)),
  beats: marks.beats.map((b) => ({ ...b, at: Number(Math.max(0, b.at - cut).toFixed(3)) })),
};
await fs.writeFile(marksFile, JSON.stringify(shifted, null, 2) + '\n');
console.log(`  ${path.basename(out)}  ${cut.toFixed(1)}s of page load trimmed, opens on "${first.beat}"`);
