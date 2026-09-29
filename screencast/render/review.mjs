// Reviewing a rendered scene.
//
// Three questions, answered mechanically so the loop does not rely on remembering
// to check: did every beat actually happen, did the page end up rich, and is there
// anything on screen worth looking at. Frames are extracted at each beat so the
// visual check is a contact sheet rather than scrubbing.
//
//   node render/review.mjs <scene-id> [--doc URL] [--sheet]

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith('--'));
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1]; };

if (!id) { console.error('usage: review.mjs <scene-id> [--doc URL] [--sheet]'); process.exit(2); }

const run = (cmd, args) => new Promise((res) => {
  const p = spawn(cmd, args);
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (err += d));
  p.on('error', (e) => res({ code: -1, out, err: e.message }));
  p.on('close', (code) => res({ code, out, err }));
});

// The mp4 is paced, so its timeline is not the capture's. Frames must be pulled
// with the remapped sidecar or every late beat lands past the end of the file —
// which is the drift the remap exists to prevent.
const capture = JSON.parse(await fs.readFile(path.join(ROOT, 'tracks', `${id}.marks.json`), 'utf8'));
const pacedPath = path.join(ROOT, 'tracks', `${id}.paced.marks.json`);
const paced = await fs.readFile(pacedPath, 'utf8').then(JSON.parse).catch(() => null);
const marks = capture;
const forFrames = paced ?? capture;

// ── did every beat happen? ────────────────────────────────────────────────────
const SUSPECT = /skipped|not offered|absent|would not|did not|no |lost|error|fail/i;
const bad = marks.beats.filter((b) => b.note && SUSPECT.test(b.note));

console.log(`\n${id} — ${marks.beats.length} beats over ${marks.duration.toFixed(1)}s`);
for (const b of marks.beats) {
  const flag = b.note && SUSPECT.test(b.note) ? '  ✗' : '   ';
  console.log(`${flag} ${b.at.toFixed(1).padStart(6)}s  ${b.beat}${b.note ? `  — ${b.note}` : ''}`);
}

// ── gaps: a beat that took much longer than its neighbours is usually a wait ──
const gaps = marks.beats.map((b, i) => ({ beat: b.beat, gap: i ? b.at - marks.beats[i - 1].at : b.at }))
  .filter((g) => g.gap > 12).sort((a, b) => b.gap - a.gap);
if (gaps.length) {
  console.log('\n  long gaps (likely waits):');
  for (const g of gaps.slice(0, 5)) console.log(`    ${g.gap.toFixed(1)}s before ${g.beat}`);
}

// ── did the page end up rich? ─────────────────────────────────────────────────
const doc = opt('doc');
if (doc) {
  const r = await run('curl', ['-sk', '-H', 'Accept: text/turtle', '--max-time', '20', doc]);
  const ttl = r.out;
  const blocks = (ttl.match(/rdf-syntax-ns#_\d+/g) ?? []).length;
  const prose = (ttl.match(/XMLLiteral/g) ?? []).length;
  const objects = (ttl.match(/linkeddatahub#Object/g) ?? []).length;
  const empty = (ttl.match(/<div xmlns="[^"]*"><\/div>|<p><\/p>/g) ?? []).length;
  console.log(`\n  document: ${blocks} blocks — ${prose} prose, ${objects} object${empty ? `, ${empty} EMPTY` : ''}`);
  if (blocks < 3) console.log('    ✗ thin: a story page wants prose and evidence interleaved');

  // An Object block whose value is itself an Object block nests, and the page then
  // renders two stacked headers for one piece of content. Every beat can pass while
  // this is wrong, so it is checked against the source rather than trusted.
  const values = [...ttl.matchAll(/rdf-syntax-ns#value>\s*<([^>]+)>/g)].map((m) => m[1]);
  for (const v of values) {
    const src = v.split('#')[0];
    const r2 = await run('curl', ['-sk', '-H', 'Accept: text/turtle', '--max-time', '20', src]);
    const frag = v.includes('#') ? `#${v.split('#')[1]}` : null;
    if (!frag) continue;
    const block = new RegExp(`<${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>[\\s\\S]{0,400}`);
    const desc = (r2.out.match(block) ?? [''])[0];
    const isObject = /linkeddatahub#Object/.test(desc);
    console.log(`    embeds ${frag}${isObject ? '  ✗ NESTED — this is an Object block, not the resource inside it' : '  ✓ inner resource'}`);
  }
}

// ── something to look at ──────────────────────────────────────────────────────
if (argv.includes('--sheet')) {
  const mp4 = path.join(ROOT, 'tracks', `${id}.mp4`);
  const shots = path.join(ROOT, 'tracks', `${id}-frames`);
  await fs.mkdir(shots, { recursive: true });
  const pick = forFrames.beats.filter((b) => !/^end$/.test(b.beat)).slice(0, 12);
  if (paced) console.log(`  (frames from the paced timeline: ${paced.duration.toFixed(1)}s)`);
  const files = [];
  for (const [i, b] of pick.entries()) {
    const f = path.join(shots, `${String(i).padStart(2, '0')}.png`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, b.at - 0.4)), '-i', mp4, '-frames:v', '1', '-vf', 'scale=640:-2', f]);
    files.push(f);
  }
  const cols = 4;
  const rows = Math.ceil(files.length / cols);
  // xstack has no multiplication: a column three across is w0+w0+w0, not w0*3.
  const axis = (n, unit) => (n ? Array(n).fill(unit).join('+') : '0');
  const layout = files
    .map((_, i) => `${axis(i % cols, 'w0')}_${axis(Math.floor(i / cols), 'h0')}`)
    .join('|');
  const sheet = path.join(ROOT, 'tracks', `${id}-sheet.png`);
  await run('ffmpeg', ['-y', '-loglevel', 'error',
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex', `${files.map((_, i) => `[${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`,
    sheet]);
  console.log(`\n  contact sheet: ${path.relative(ROOT, sheet)} (${files.length} frames, ${cols}x${rows})`);
}

// A scene that died half way looks identical to one that finished, unless the
// terminal beat is checked: every beat that ran can succeed while most never ran.
const finished = marks.beats.some((b) => b.beat === 'end');
const verdict = [];
if (!finished) verdict.push('✗ ABORTED — no `end` beat, the scene did not reach its close');
if (bad.length) verdict.push(`✗ ${bad.length} beat(s) did not do what they claim`);
if (!verdict.length) verdict.push('✓ ran to completion, every beat reported success');
console.log(`\n  ${verdict.join('\n  ')}\n`);
