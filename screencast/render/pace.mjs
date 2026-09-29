// Speed up the dead air, leave the gestures alone.
//
// A uniform 2x scales the pointer travel and the typing as well as the waiting, so
// the whole thing reads as a machine on fast-forward. What actually wants removing
// is the static time: the dwells after each beat where nothing moves.
//
// Rather than trusting the scene to declare where those are, this measures them —
// ffmpeg's freezedetect reports every interval where consecutive frames are
// identical, which is exactly a dwell. Those segments get the speed-up; everything
// else passes through at 1x. The marks sidecar is remapped onto the new timeline,
// so the edit list still points at the right frames.
//
//   node render/pace.mjs tracks/scene.webm tracks/scene-paced.mp4 --dwell 4
//
// Options: --dwell N (speed for static stretches, default 3), --min S (ignore
// freezes shorter than this, default 0.5s), --noise dB (freezedetect sensitivity,
// default -50dB), --crf N, --marks FILE, --out-marks FILE.

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const argv = process.argv.slice(2);
const [input, output] = argv.filter((a) => !a.startsWith('--') && !isOptionValue(a));
function isOptionValue(a) {
  const i = argv.indexOf(a);
  return i > 0 && argv[i - 1].startsWith('--');
}
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

if (!input || !output) {
  console.error('usage: pace.mjs <input.webm> <output.mp4> [--dwell 3] [--min 0.5] [--noise -50dB] [--crf 20] [--marks f] [--out-marks f]');
  process.exit(2);
}

const dwellSpeed = Number(opt('dwell', 3));
const minFreeze = Number(opt('min', 0.5));
const noise = opt('noise', '-50dB');
const crf = opt('crf', '20');
const marksIn = opt('marks', null);
const marksOut = opt('out-marks', null);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-1500)}`))));
  });
}

// ── 1. how long is it, and where does nothing move? ────────────────────────────
const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input]);
const duration = Number(probe.out.trim());

const detect = await run('ffmpeg', ['-i', input, '-vf', `freezedetect=n=${noise}:d=${minFreeze}`, '-map', '0:v', '-f', 'null', '-']);

const freezes = [];
let pending = null;
for (const line of detect.err.split('\n')) {
  const start = line.match(/freeze_start:\s*([\d.]+)/);
  const end = line.match(/freeze_end:\s*([\d.]+)/);
  if (start) pending = Number(start[1]);
  if (end && pending !== null) {
    freezes.push([pending, Number(end[1])]);
    pending = null;
  }
}
if (pending !== null) freezes.push([pending, duration]); // a freeze that runs to the end

// ── 2. turn that into an alternating segment list ──────────────────────────────
const segments = [];
let cursor = 0;
for (const [s, e] of freezes) {
  if (s > cursor) segments.push({ start: cursor, end: s, speed: 1 });
  segments.push({ start: s, end: Math.min(e, duration), speed: dwellSpeed });
  cursor = Math.min(e, duration);
}
if (cursor < duration) segments.push({ start: cursor, end: duration, speed: 1 });

// A dwell speed of 1 means "do not pace" — fall through to a straight transcode
// rather than building a concat graph that changes nothing.
const kept = dwellSpeed === 1
  ? [{ start: 0, end: duration, speed: 1 }]
  : segments.filter((s) => s.end - s.start > 0.04);
if (!kept.length) {
  console.error('no segments — is the input empty?');
  process.exit(1);
}

const staticTime = kept.filter((s) => s.speed !== 1).reduce((a, s) => a + (s.end - s.start), 0);
const newDuration = kept.reduce((a, s) => a + (s.end - s.start) / s.speed, 0);

console.log(`${input}`);
console.log(`  ${duration.toFixed(1)}s, ${freezes.length} static stretches totalling ${staticTime.toFixed(1)}s`);
console.log(`  ${kept.length} segments → ${newDuration.toFixed(1)}s with dwells at ${dwellSpeed}x`);

// ── 3. build the filtergraph and encode ────────────────────────────────────────
const parts = kept.map((s, i) =>
  `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=(PTS-STARTPTS)${s.speed === 1 ? '' : `/${s.speed}`}[v${i}]`);
const graph = `${parts.join(';')};${kept.map((_, i) => `[v${i}]`).join('')}concat=n=${kept.length}:v=1:a=0[out]`;

await run('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', input,
  '-filter_complex', graph, '-map', '[out]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf),
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
]);
console.log(`  → ${output}`);

// ── 4. remap the marks onto the new timeline ───────────────────────────────────
if (marksIn && marksOut) {
  const remap = (t) => {
    let acc = 0;
    for (const s of kept) {
      if (t >= s.end) { acc += (s.end - s.start) / s.speed; continue; }
      if (t > s.start) return acc + (t - s.start) / s.speed;
      return acc;
    }
    return acc;
  };
  const marks = JSON.parse(await fs.readFile(marksIn, 'utf8'));
  const scaled = {
    ...marks,
    paced: { dwellSpeed, minFreeze, noise },
    sourceDuration: marks.duration,
    duration: newDuration,
    beats: marks.beats.map((b) => ({ ...b, at: Number(remap(b.at).toFixed(3)) })),
  };
  await fs.writeFile(marksOut, JSON.stringify(scaled, null, 2) + '\n');
  console.log(`  → ${marksOut}`);
}
