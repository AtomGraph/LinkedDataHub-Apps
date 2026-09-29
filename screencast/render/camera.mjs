// A camera move over a raw take: a shot cut from a 2880x1800 recording with a zoom
// and pan that follow the work, keyframed by hand.
//
// A raw track is the whole viewport at 2x. A shot is a window onto it: tight on the
// editor while a query is typed, panning to the button that submits it, opening out
// when the result has arrived so the cause and the effect share the frame. The window
// is a list of keyframes — a time, a zoom and a centre in the take's own pixels — and
// the move between two keyframes is linear, which reads as a steady dolly rather than
// a cut. Nothing is lifted or reordered; the only edit is where the window looks.
//
//   node render/camera.mjs tracks/supercut-compose.webm tracks/.supercut/q2c.mp4 \
//     --from 9 --to 44.4 --keys camera/q2c.keys.json --pace 3
//
// The keys file is [{ "t": seconds, "z": zoom, "cx": px, "cy": px }, …] on the take's
// timeline, in the take's pixels. z=1 is the full viewport; z=2 shows a quarter of it
// at 1:1. The window is clamped to the frame, so a centre near an edge is safe. A move
// eases in and out, so the window settles rather than stops.
//
// With --pace N the passage goes through render/pace.mjs FIRST, at full size, and the
// keys are remapped through the pacer's marks sidecar before the camera runs on the
// paced clip. Pacing after the camera would speed the move up wherever the page under
// it happened to be still, and a dolly that lurches is worse than a cut.
//
// A page scroll in a Playwright recording is a jump: one frame at the top, the next
// 1800px down. --scroll FILE replaces it with the scroll a person would have seen,
// rendered from a stitched full-page capture: FILE names the span to replace, where the
// page already sits (`offset`) and how far it scrolls, the height of the fixed chrome,
// and where the raw take resumes, plus the
// capture as `stitch` (default: the .scroll.png beside it). Keys are written on the raw
// timeline and shifted past the splice.
//
// Options: --size WxH (default 1440x900), --fps N (default 30), --crf N (default 20),
// --pace N (dwell speed for static stretches; omit to leave the timeline alone),
// --min-move S (shortest a move may take after pacing, default 0.8),
// --hold S (freeze the last frame for S seconds, so a closing caption has time to be read),
// --scroll FILE (a *.scroll.json beside the take; see above).

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [input, output] = positional;
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
if (!input || !output || !opt('keys')) {
  console.error('usage: camera.mjs <take.webm> <shot.mp4> --keys keys.json [--from S] [--to S] [--size 1440x900] [--fps 30] [--crf 20]');
  process.exit(2);
}
const from = Number(opt('from', 0));
const to = opt('to', null) === null ? null : Number(opt('to'));
const [ow, oh] = opt('size', '1440x900').split('x').map(Number);
const fps = Number(opt('fps', 30));
const crf = opt('crf', '20');
const keys = JSON.parse(await fs.readFile(opt('keys'), 'utf8')).sort((a, b) => a.t - b.t);

const probe = await new Promise((resolve) => {
  const p = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', input]);
  let out = ''; p.stdout.on('data', (d) => { out += d; }); p.on('close', () => resolve(JSON.parse(out).streams[0]));
});
const iw = probe.width, ih = probe.height;

// Pace first, if asked: trim the passage at full size to a constant rate, run the
// pacer with the keys as beats, and take the remapped times back.
let source = input;
let start = from;
let end = to;
const ff = (args) => new Promise((resolve) => {
  const p = spawn('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', resolve);
});
const enc = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p'];

// The scroll splice, if asked: raw up to the jump, the rendered scroll, raw from the
// resume point. The chrome stays put, taken from the frame before the jump; the page
// under it eases down the stitched capture.
const scrollFile = opt('scroll', null);
if (scrollFile !== null) {
  const sc = JSON.parse(await fs.readFile(scrollFile, 'utf8'));
  const stitch = sc.stitch
    ? path.resolve(path.dirname(scrollFile), sc.stitch)
    : path.resolve(path.dirname(scrollFile), path.basename(scrollFile).replace(/\.scroll\.json$/, '.scroll.png'));
  const dur = Number((sc.to - sc.from).toFixed(3));
  const page = ih - sc.chrome;
  const spliced = output.replace(/\.mp4$/, '') + '.spliced.mp4';
  const P = `min(1\\,t/${dur})`;   // commas inside a filter expression are escaped
  const ease = `(${P}*${P}*(3-2*${P}))`;
  const code = await ff([
    '-ss', String(from), '-to', String(sc.from), '-i', input,          // 0: raw before the jump
    '-ss', String(sc.from), '-i', input,                                // 1: a frame for the chrome
    '-loop', '1', '-t', String(dur), '-i', stitch,                      // 2: the stitched page
    '-ss', String(sc.resume), ...(to === null ? [] : ['-to', String(to)]), '-i', input, // 3: raw after
    '-filter_complex',
    `[0]fps=${fps},setpts=PTS-STARTPTS[a];` +
    `[1]trim=end_frame=1,crop=iw:${sc.chrome}:0:0,loop=loop=-1:size=1,fps=${fps},trim=duration=${dur},setpts=PTS-STARTPTS[chrome];` +
    `[2]fps=${fps},crop=${iw}:${page}:0:'${sc.chrome}+${sc.offset ?? 0}+${sc.scroll}*${ease}',setpts=PTS-STARTPTS[pg];` +
    `[chrome][pg]vstack,format=yuv420p[b];` +
    `[3]fps=${fps},setpts=PTS-STARTPTS[c];` +
    `[a][b][c]concat=n=3:v=1:a=0[v]`,
    '-map', '[v]', ...enc, spliced,
  ]);
  if (code !== 0) process.exit(code);
  // Keys past the splice move up by what was dropped; keys inside it land on its end.
  const dropped = sc.resume - sc.to;
  for (const k of keys) {
    if (k.t >= sc.resume) k.t -= dropped;
    else if (k.t > sc.to) k.t = sc.to;
  }
  source = spliced; start = 0; end = null;
  const at = (t) => t - from;
  keys.forEach((k) => { k.t = at(k.t); });
}

const pace = opt('pace', null);
if (pace !== null) {
  const take = output.replace(/\.mp4$/, '') + '.take.mp4';
  const paced = output.replace(/\.mp4$/, '') + '.paced.mp4';
  const marksIn = take.replace(/\.mp4$/, '.marks.json');
  const marksOut = paced.replace(/\.mp4$/, '.marks.json');
  const trim = await ff(['-ss', String(start), ...(end === null ? [] : ['-to', String(end)]), '-i', source, '-vf', `fps=${fps}`, ...enc, take]);
  if (trim !== 0) process.exit(trim);
  await fs.writeFile(marksIn, JSON.stringify({ scene: 'camera', track: take, beats: keys.map((k, i) => ({ beat: `k${i}`, at: k.t - start })) }));
  const pacer = new URL('./pace.mjs', import.meta.url).pathname;
  const pacedCode = await new Promise((resolve) => {
    const p = spawn('node', [pacer, take, paced, '--dwell', String(pace), '--crf', '16', '--marks', marksIn, '--out-marks', marksOut], { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', resolve);
  });
  if (pacedCode !== 0) process.exit(pacedCode);
  const remapped = JSON.parse(await fs.readFile(marksOut, 'utf8')).beats;
  keys.forEach((k, i) => { k.t = remapped.find((b) => b.beat === `k${i}`).at; });
  // A move that crossed a dwell came out compressed with it. Give every move at least
  // MIN_MOVE seconds by starting it earlier: the arrival stays on its beat, since that
  // is the frame that has to be right (the button is clicked; the window is on it).
  const MIN_MOVE = Number(opt('min-move', 0.8));
  for (let i = keys.length - 2; i >= 0; i--) {
    const a = keys[i], b = keys[i + 1];
    const moves = a.z !== b.z || a.cx !== b.cx || a.cy !== b.cy;
    if (moves && b.t - a.t < MIN_MOVE) a.t = Math.max(i > 0 ? keys[i - 1].t : 0, b.t - MIN_MOVE);
  }
  source = paced; start = 0; end = null;
}

// Piecewise-linear expression in the take's time. Time is the input frame index over
// the constant rate, since zoompan's own clock is unreliable on this input; after a
// trim it restarts at zero, so the keys are shifted by `from`.
const T = `(in/${fps})`;
const piecewise = (field) => {
  const ks = keys.map((k) => ({ t: k.t - start, v: k[field] }));
  let expr = String(ks[ks.length - 1].v);
  for (let i = ks.length - 2; i >= 0; i--) {
    const a = ks[i], b = ks[i + 1];
    const span = Math.max(b.t - a.t, 1e-6);
    // smoothstep between the two keys: eased in and out, no velocity step at either end
    const P = `max(0,min(1,(${T}-${a.t.toFixed(3)})/${span.toFixed(3)}))`;
    expr = `if(lt(${T},${b.t.toFixed(3)}),${a.v}+(${b.v}-${a.v})*(${P}*${P}*(3-2*${P})),${expr})`;
  }
  return expr;
};
const z = piecewise('z');
const cx = piecewise('cx');
const cy = piecewise('cy');
// zoompan wants the window's top-left; keep it inside the frame.
const x = `max(0,min(iw-iw/zoom,(${cx})-iw/(2*zoom)))`;
const y = `max(0,min(ih-ih/zoom,(${cy})-ih/(2*zoom)))`;

const trimArgs = ['-ss', String(start), ...(end === null ? [] : ['-to', String(end)])];
// The take is variable frame rate (Playwright's webm) and zoompan ignores input timing,
// so it is made constant first and the timestamps are rebuilt after.
const hold = Number(opt('hold', 0));
const vf = `fps=${fps},zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${ow}x${oh}:fps=${fps},setpts=N/(${fps}*TB)` +
  (hold > 0 ? `,tpad=stop_mode=clone:stop_duration=${hold}` : '');
const args = ['-v', 'error', '-y', ...trimArgs, '-i', source, '-vf', vf, '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output];
const code = await new Promise((resolve) => {
  const p = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', resolve);
});
if (code !== 0) process.exit(code);
console.log(`${output}  ${ow}x${oh}  ${keys.length} keys over ${from}s–${to ?? 'end'}s of ${input} (${iw}x${ih})${pace !== null ? `, paced at ${pace}x` : ''}`);
