// Cutting the supercut from gesture takes.
//
// A shot is the stretch of a track between two beats named in its marks sidecar (or
// seconds), plus an optional hold on the last frame so a result sits on screen. Each
// shot is trimmed from the raw .webm at real speed, scaled to one frame size, given
// its caption (same box on every shot), then the shots are joined with a short
// crossfade. Two renders from one list: every shot, and the spine (shots flagged
// `spine`). A sidecar records each shot's in/out on the final timeline.
//
//   node render/supercut.mjs [render/supercut.json] [--spine-only] [--no-spine]

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const cfgPath = argv.find((a) => !a.startsWith('--')) ?? 'render/supercut.json';
const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
const TRACKS = 'tracks';
const TMP = path.join(TRACKS, '.supercut');
await fs.mkdir(TMP, { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.slice(0, 6).join(' ')}…\n${err.slice(-800)}`))));
  });
}
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

const marksCache = new Map();
async function beat(track, ref) {
  if (typeof ref === 'number') return { at: ref };
  if (!marksCache.has(track)) marksCache.set(track, JSON.parse(await fs.readFile(path.join(TRACKS, `${track}.marks.json`), 'utf8')));
  // a beat marked twice (a retaken step) counts from its last mark
  const b = marksCache.get(track).beats.findLast((x) => x.beat === ref);
  if (!b) throw new Error(`${track}: no beat ${ref}`);
  return b;
}
const beatTime = async (track, ref) => (await beat(track, ref)).at;

// Framing. A focus box becomes a crop frame: padded, held to the output aspect, never
// closer than `maxZoom` nor wider than `minZoom` allows, anchored on the box's top part
// when the box is taller than the frame (its header and first rows are there).
// `points` are pointer positions the frame must contain (the click at either end of
// the shot): the box widens to take them in, and a frame zoomed past 1.6× is centred
// on the last of them — the click — rather than on the block.
function frameFor(box, W, H, { maxZoom = 2.4, minZoom = 1.4, pad = 0.1 } = {}, points = []) {
  const pts = points.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!box && !pts.length) return { w: W, h: H, cx: W / 2, cy: H / 2 };
  if (!box) return { w: W, h: H, cx: W / 2, cy: H / 2 };
  const R = 70;
  for (const p of pts) {
    const x1 = Math.min(box.x, p.x - R), y1 = Math.min(box.y, p.y - R), x2 = Math.max(box.x + box.w, p.x + R), y2 = Math.max(box.y + box.h, p.y + R);
    box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  let w = box.w * (1 + 2 * pad), h = box.h * (1 + 2 * pad);
  if (w / h > W / H) h = w * H / W; else w = h * W / H;
  w = Math.max(w, W / maxZoom); h = Math.max(h, H / maxZoom);
  w = Math.min(w, W); h = Math.min(h, H);
  let cy = box.y + box.h / 2;
  if (W / w < minZoom) { w = W / minZoom; h = H / minZoom; }
  if (box.h > h) cy = box.y + h * 0.45;
  let cx = box.x + box.w / 2;
  if (pts.length && W / w >= 1.6) { const p = pts[pts.length - 1]; cx = p.x; cy = p.y; }
  cx = Math.min(Math.max(cx, w / 2), W - w / 2); cy = Math.min(Math.max(cy, h / 2), H - h / 2);
  return { w, h, cx, cy };
}
// A crop that moves from frame A to frame B, smoothstepped over `T` seconds starting at
// `t0`, expressed in the crop filter's own `t` so it costs nothing to render. The push-in
// is A = the full frame, t0 = 0; a pan is A = one block, B = the next; a static frame is
// A = B.
function cropBetween(A, B, t0, T) {
  const f = (v) => v.toFixed(1);
  const u = `((t-${f(t0)})/${f(Math.max(0.01, T))})`;
  const k = `(if(lt(t,${f(t0)}),0,if(lt(t,${f(t0 + T)}),(3*pow(${u},2)-2*pow(${u},3)),1)))`;
  const lerp = (a, b) => `(${f(a)}+(${f(b)}-${f(a)})*${k})`;
  const cw = lerp(A.w, B.w), ch = lerp(A.h, B.h), cx = lerp(A.cx, B.cx), cy = lerp(A.cy, B.cy);
  return `crop=w='${cw}':h='${ch}':x='${cx}-${cw}/2':y='${cy}-${ch}/2'`;
}
// A crop that passes through several frames — the block, the control about to be
// clicked, the result — each reached by a smoothstep move of `M` seconds ending at its
// keyframe time (the beat where the pointer arrived), and held until the next move.
function cropPath(keys, M) {
  const f = (v) => v.toFixed(1);
  const lerp = (a, b, k) => `(${f(a)}+(${f(b)}-${f(a)})*${k})`;
  const dim = (name) => {
    let expr = f(keys[keys.length - 1].F[name]);
    for (let i = keys.length - 2; i >= 0; i--) {
      const t1 = keys[i + 1].t, m = Math.max(0.01, Math.min(M, t1 - keys[i].t));
      const u = `(max(0,min(1,(t-${f(t1 - m)})/${f(m)})))`;
      const k = `(3*pow(${u},2)-2*pow(${u},3))`;
      expr = `if(lt(t,${f(t1)}),${lerp(keys[i].F[name], keys[i + 1].F[name], k)},${expr})`;
    }
    return expr;
  };
  const cw = dim('w'), ch = dim('h'), cx = dim('cx'), cy = dim('cy');
  return `crop=w='${cw}':h='${ch}':x='${cx}-${cw}/2':y='${cy}-${ch}/2'`;
}
async function duration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    let out = ''; p.stdout.on('data', (d) => (out += d));
    p.on('close', (c) => (c === 0 ? resolve(Number(out.trim())) : reject(new Error('ffprobe failed'))));
  });
}

// The caption as a transparent PNG the size of the frame, rendered by the same browser
// the takes were made with: white bold text in a translucent black box, bottom-left.
let browser = null;
async function renderCaption(text, out) {
  const { chromium } = await import('playwright');
  browser ??= await chromium.launch();
  const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1 });
  const size = cfg.caption?.size ?? 44;
  await page.setContent(`<body style="margin:0;background:transparent"><div style="position:fixed;left:48px;bottom:48px;padding:14px 22px;border-radius:12px;background:rgba(0,0,0,.62);color:#fff;font:700 ${size}px -apple-system,Helvetica,Arial,sans-serif;letter-spacing:-.01em">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div></body>`);
  await page.screenshot({ path: out, omitBackground: true });
  await page.close();
}

async function cutShot(shot) {
  // a mock renders straight to .mp4; a recording is a .webm
  let src = path.join(TRACKS, `${shot.track}.webm`);
  if (!(await fs.access(src).then(() => true, () => false))) src = path.join(TRACKS, `${shot.track}.mp4`);
  const exists = await fs.access(src).then(() => true, () => false);
  if (!exists) { if (shot.optional) { console.log(`  skip ${shot.id}: no ${src}`); return null; } throw new Error(`missing ${src}`); }
  // A beat and its gesture (or teardown) are the same instant, so the frame AT a beat
  // is already the next state: lead in a little before `from`, stop a little before `to`.
  const same = shot.from === shot.to;
  let bFrom, bTo;
  try { bFrom = await beat(shot.track, shot.from); bTo = await beat(shot.track, shot.to); }
  catch (e) { if (shot.optional) { console.log(`  skip ${shot.id}: ${e.message}`); return null; } throw e; }
  // `fromOffset` / `toOffset` shift a shot's ends in seconds (a negative `toOffset`
  // ends a shot before its beat, where a helper's settle after the result is dead air).
  let from = Math.max(0, bFrom.at - (same ? 0 : (cfg.leadSeconds ?? 0.3)) + (shot.fromOffset ?? 0));
  const to = same ? from : bTo.at - (cfg.trailSeconds ?? 0.1) + (shot.toOffset ?? 0);
  // A gesture that took longer than a shot should keeps its end — the result — and
  // loses its beginning.
  // `speed` plays the gesture faster than it was made (typing a query at 2×); the cap
  // is on screen time, so a sped shot keeps more of the take.
  const speed = shot.speed ?? 1;
  const max = shot.maxSeconds ?? cfg.maxSeconds ?? 6;
  if ((to - from) / speed > max) from = to - max * speed;
  // The focus: the end beat's box (where the result is), else the start beat's.
  const box = shot.focus === false ? null : (bTo.focus ?? bFrom.focus ?? null);
  const hold = shot.hold ?? 0;
  const out = path.join(TMP, `${shot.id}.mp4`);
  const { width, height, fps, crf } = cfg;
  const filters = [];
  if (speed !== 1) filters.push(`setpts=PTS/${speed}`);
  if (to > from && hold > 0) filters.push(`tpad=stop_mode=clone:stop_duration=${hold}`);
  // Source frames are the take's own size (2880×1800 for 2× takes); the push-in crops
  // in source pixels, then everything is scaled to the output frame.
  const srcSize = shot.source ?? cfg.source ?? { width: 2880, height: 1800 };
  // The push runs the whole shot (gesture + hold), never a lunge-then-hold.
  const total = (to > from ? (to - from) / speed : 0) + hold;
  // Framing: `move` is "push" (the full frame closes on the end box over the whole
  // shot), "static" (the end box's frame throughout) or "pan" (from the start beat's
  // box to the end beat's, over `moveSeconds` starting `moveAt` seconds in — negative
  // counts back from the end of the gesture, where the new block has just appeared).
  if (box) {
    const W = srcSize.width, H = srcSize.height;
    const limits = { maxZoom: shot.maxZoom ?? cfg.maxZoom ?? 2.4, minZoom: shot.minZoom ?? cfg.minZoom ?? 1.4, pad: shot.pad ?? 0.1 };
    // Pointer positions ride in the sidecar but only shape the frame when a shot asks
    // (`keepPointer: true`): unioning them into every frame pushed the crops out to the
    // full frame and flattened the pans. Keep the click inside the block by scene
    // design instead — the cursor travels within the framed block.
    const pFrom = shot.keepPointer ? bFrom.pointer ?? null : null, pTo = shot.keepPointer ? bTo.pointer ?? null : null;
    const move = shot.move ?? 'push';
    const B = frameFor(box, W, H, limits, move === 'pan' ? [pTo] : [pFrom, pTo]);
    // `via`: beats inside the shot whose focus boxes the crop passes through — the
    // control the pointer reaches before a click — each on its own smooth move
    if (Array.isArray(shot.via) && shot.via.length) {
      const A = frameFor(bFrom.focus ?? box, W, H, limits);
      const viaLimits = { ...limits, maxZoom: shot.viaZoom ?? Math.max(limits.maxZoom, 1.6), minZoom: 1 };
      const keys = [{ t: 0, F: A }];
      for (const name of shot.via) {
        const b = await beat(shot.track, name).catch(() => null);
        if (!b || !b.focus) { console.log(`  ${shot.id}: via ${name} missing, skipped`); continue; }
        const t = (b.at - from) / speed;
        if (t <= 0 || t >= (to > from ? (to - from) / speed : 0)) continue;
        keys.push({ t, F: frameFor(b.focus, W, H, viaLimits) });
      }
      keys.push({ t: to > from ? (to - from) / speed : 0.01, F: B });
      filters.push(cropPath(keys, shot.moveSeconds ?? cfg.viaSeconds ?? 1.0));
    } else if (move === 'static') filters.push(cropBetween(B, B, 0, 0.01));
    else if (move === 'pan') {
      const A = frameFor(bFrom.focus ?? box, W, H, limits, [pFrom]);
      // a move between blocks is gradual — the eye travelling down the page, never a jump
      const T = shot.moveSeconds ?? cfg.moveSeconds ?? 1.4;
      const gesture = to > from ? (to - from) / speed : 0;
      let t0 = shot.moveAt ?? -(T + 0.2);
      if (t0 < 0) t0 = Math.max(0, gesture + t0);
      filters.push(cropBetween(A, B, t0, T));
    } else filters.push(cropBetween({ w: W, h: H, cx: W / 2, cy: H / 2 }, B, 0, shot.push ?? Math.max(0.8, total)));
  }
  filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`, `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${cfg.padColor ?? 'black'}`, `fps=${fps}`);
  if (cfg.vignette) filters.push(`vignette=angle=${cfg.vignette}`);
  if (!filters.length) filters.push('null');
  // The caption is a PNG the size of the frame (this ffmpeg has no drawtext), laid over
  // the scaled video with the overlay filter.
  let capPng = null;
  if (shot.caption) {
    capPng = path.join(TMP, `${shot.id}.caption.png`);
    await renderCaption(shot.caption, capPng);
  }
  // A keyframe at the start of every clip and one timescale, so the concat cuts clean.
  const enc = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', String(fps), '-force_key_frames', 'expr:eq(n,0)', '-video_track_timescale', '90000'];
  const graph = (vf) => capPng ? ['-filter_complex', `[0:v]${vf}[b];[b][1:v]overlay=0:0:format=auto[v]`, '-map', '[v]'] : ['-vf', vf];
  const capIn = capPng ? ['-i', capPng] : [];
  if (to > from) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-to', String(to), '-i', src, ...capIn, ...graph(filters.join(',')), ...enc, out]);
  } else {
    // a held frame: extract it, then loop it for `hold` seconds
    const png = path.join(TMP, `${shot.id}.png`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-i', src, '-frames:v', '1', png]);
    const still = filters.filter((f) => !f.startsWith('tpad')).join(',');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(hold), '-i', png, ...capIn, ...graph(still), ...enc, out]);
  }
  const len = await duration(out);
  console.log(`  ${shot.id.padEnd(3)} ${shot.track} ${String(shot.from).padEnd(9)} → ${String(shot.to).padEnd(8)} ${((to - from) / speed).toFixed(2)}s${speed !== 1 ? ' at ' + speed + '×' : ''} + ${hold}s hold = ${len.toFixed(2)}s${shot.caption ? '  "' + shot.caption + '"' : ''}`);
  return { ...shot, file: out, len };
}

async function join(shots, output) {
  // Hard cuts through the concat demuxer: one decoder at a time, so fifteen shots do
  // not mean fifteen decoders in memory (a single xfade graph over all inputs was
  // killed for memory). Every clip shares size, fps, codec and pixel format.
  const list = path.join(TMP, `${path.basename(output, '.mp4')}.txt`);
  await fs.writeFile(list, shots.map((s) => `file '${path.resolve(s.file)}'`).join('\n') + '\n');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
  let t = 0; const timeline = [];
  for (const s of shots) { timeline.push({ id: s.id, in: Number(t.toFixed(3)), out: Number((t + s.len).toFixed(3)), caption: s.caption ?? null }); t += s.len; }
  await fs.writeFile(output.replace(/\.mp4$/, '.marks.json'), JSON.stringify({ output, duration: Number(t.toFixed(3)), shots: timeline }, null, 2));
  console.log(`→ ${output}  ${t.toFixed(1)}s, ${shots.length} shots`);
}

const cut = [];
for (const shot of cfg.shots) { const c = await cutShot(shot); if (c) cut.push(c); }
if (!argv.includes('--spine-only')) await join(cut, cfg.output);
if (!argv.includes('--no-spine')) await join(cut.filter((s) => s.spine), cfg.spineOutput);
if (browser) await browser.close();
