// Put the best frame first.
//
// Every scene opens on an empty document, because that is where the workflow honestly
// starts — and it puts a blank page on screen for the only two seconds that decide
// whether anyone watches the rest. This lifts the payoff to the front: a few seconds
// of the moment the workflow was for, then the scene from the beginning.
//
// The opening is a real segment of THIS take, not a fabricated flourish. A cold open
// showing something the workflow never produced is the same lie as a staged
// screenshot; the beat-keyed marks sidecar is what makes taking a real one cheap.
//
//   node render/cold-open.mjs tracks/02-briefing.mp4 --beat map --hold 2.6
//
// A flash-forward alone is not enough, and measuring says why: these takes spend
// 14-18% of their length on an empty document before the first content appears, so
// cutting back from the teaser lands in fifteen seconds of nothing. --from trims the
// start to a named beat as well, so the cut lands where something is happening.
//
// Options: --beat ID (the teaser moment), --hold S (default 2.5), --from ID (trim the
// start to this beat), --marks FILE, --out FILE, --crf N.

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const src = argv[0];
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
if (!src) { console.error('usage: cold-open.mjs <track.mp4> --beat ID [--hold S]'); process.exit(2); }

const base = src.replace(/\.mp4$/, '');
const marksFile = opt('marks', `${base}.paced.marks.json`);
const out = opt('out', `${base}.open.mp4`);
const hold = Number(opt('hold', 2.5));
const crf = opt('crf', '20');
const beatId = opt('beat');
const fromId = opt('from');

const run = (cmd, a) => new Promise((res, rej) => {
  const p = spawn(cmd, a); let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-500)))));
});
const probe = async (f, entry) => new Promise((res) => {
  const p = spawn('ffprobe', ['-v', 'error', '-show_entries', entry, '-of', 'csv=p=0', f]);
  let o = ''; p.stdout.on('data', (d) => (o += d)); p.on('close', () => res(o.trim()));
});

const marks = JSON.parse(await fs.readFile(marksFile, 'utf8'));
const beat = marks.beats.find((b) => b.beat === beatId);
if (!beat) {
  console.error(`no beat "${beatId}" in ${path.basename(marksFile)} — have: ${marks.beats.map((b) => b.beat).join(', ')}`);
  process.exit(2);
}

const duration = Number(await probe(src, 'format=duration'));

// where the body starts, once the empty opening is trimmed
let bodyFrom = 0;
if (fromId) {
  const b = marks.beats.find((x) => x.beat === fromId);
  if (!b) { console.error(`no beat "${fromId}" to trim to`); process.exit(2); }
  bodyFrom = Math.max(0, b.at - 1.2); // a moment before it, so the gesture is seen starting
}
// The mark is when the beat was ANNOUNCED, so the moment itself is just before it;
// backing off a little lands on the result rather than on the gesture that caused it.
const from = Math.max(0, Math.min(beat.at - 0.4, duration - hold));

const tmp = `${base}.__open.mp4`;
await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-t', String(hold), '-i', src,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-an', tmp]);

// concat filter rather than the demuxer: re-encoding once avoids the timestamp
// discontinuity that makes players stall at the splice
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ss', String(bodyFrom), '-i', src,
  '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]', '-map', '[v]',
  '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', crf,
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
await fs.rm(tmp, { force: true });

// the whole timeline shifts by the cold open, so the edit list has to move with it
const shifted = {
  ...marks,
  coldOpen: { beat: beatId, from: Number(from.toFixed(2)), hold, trimmedTo: fromId ?? null },
  duration: marks.duration - bodyFrom + hold,
  beats: [
    { beat: 'cold-open', at: 0, note: `${beatId} — lifted from ${from.toFixed(1)}s` },
    ...marks.beats
      .filter((b) => b.at >= bodyFrom)
      .map((b) => ({ ...b, at: Number((b.at - bodyFrom + hold).toFixed(3)) })),
  ],
};
await fs.writeFile(`${base}.open.marks.json`, JSON.stringify(shifted, null, 2) + '\n');

const size = (await fs.stat(out)).size;
const cut = bodyFrom > 0 ? `, ${bodyFrom.toFixed(1)}s of empty opening trimmed` : '';
console.log(`  ${path.basename(out)}  ${(duration - bodyFrom + hold).toFixed(1)}s  ${(size / 1048576).toFixed(1)}MB  ← "${beatId}" @ ${from.toFixed(1)}s${cut}`);
