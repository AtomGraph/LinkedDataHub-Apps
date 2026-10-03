// Cutting the overview film from its takes, to the voice.
//
// The cut list (overview/cut.json) is the script's shots in order, each naming a take
// and the beats it runs between, plus chapter cards between the chapters and the
// closing card at the end. The narration decides the timing: a shot holds for at least
// its line (the cached ElevenLabs take in tracks/overview/voice.json) plus a pause, on
// the last frame if the gesture was shorter, and a gesture longer than its line keeps
// its own length, or is played a little faster where the list says so.
//
// Framing is the supercut's: a take is 2880×1800, and a shot is a 16:9 window on it
// that zooms gently onto the beat's focus box (or sits still). Terminal takes are
// 1440×810 and fill the frame; the phone take sits in the frame at its own aspect.
//
// Sound: every line placed at its shot's start, music under the lot and ducked while a
// line plays, loudness to −14 LUFS, a fade at the very end. Subtitles come out as an
// .srt beside the film, cued from the lines' character alignments.
//
//   node render/overview.mjs [overview/cut.json] [--only A1,A2] [--no-audio]

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const cfgPath = path.resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only' && argv[i - 1] !== '--reuse') ?? path.join(ROOT, 'overview', 'cut.json'));
const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
const onlyArg = argv.indexOf('--only');
const only = onlyArg === -1 ? null : new Set(argv[onlyArg + 1].split(','));
const noAudio = argv.includes('--no-audio');
// --reuse keeps the clips already cut (tracks/.overview/<id>.mp4) and re-cuts only the ids
// named after it, so a change to one shot does not re-encode the film's thirty.
const reuseArg = argv.indexOf('--reuse');
const reuse = reuseArg === -1 ? null : new Set((argv[reuseArg + 1] ?? '').startsWith('--') || !argv[reuseArg + 1] ? [] : argv[reuseArg + 1].split(','));
const at = (p) => path.resolve(ROOT, p);
const TRACKS = at('tracks');
const TMP = path.join(TRACKS, '.overview');
await fs.mkdir(TMP, { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.slice(0, 8).join(' ')}…\n${err.slice(-1200)}`))));
  });
}
async function duration(file) {
  return Number((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])).trim());
}

// ── beats ───────────────────────────────────────────────────────────────────────
const marksCache = new Map();
async function beat(track, ref) {
  if (typeof ref === 'number') return { at: ref };
  if (!marksCache.has(track)) marksCache.set(track, JSON.parse(await fs.readFile(path.join(TRACKS, `${track}.marks.json`), 'utf8')));
  const b = marksCache.get(track).beats.findLast((x) => x.beat === ref);
  if (!b) throw new Error(`${track}: no beat ${ref}`);
  return b;
}

// ── the voice ───────────────────────────────────────────────────────────────────
const voice = new Map();
for (const l of JSON.parse(await fs.readFile(at(cfg.voice), 'utf8'))) voice.set(l.id, { ...l, file: path.join(TRACKS, l.file) });
async function alignmentOf(line) {
  return JSON.parse(await fs.readFile(line.file.replace(/\.mp3$/, '.json'), 'utf8'));
}

// ── framing (the supercut's) ─────────────────────────────────────────────────────
function frameFor(box, W, H, { maxZoom = 2.4, minZoom = 1.4, pad = 0.1 } = {}, bounds = { W, H }) {
  if (!box) return { w: W, h: H, cx: W / 2, cy: H / 2 };
  let w = box.w * (1 + 2 * pad), h = box.h * (1 + 2 * pad);
  if (w / h > W / H) h = w * H / W; else w = h * W / H;
  w = Math.max(w, W / maxZoom); h = Math.max(h, H / maxZoom);
  w = Math.min(w, W); h = Math.min(h, H);
  let cy = box.y + box.h / 2;
  if (W / w < minZoom) { w = W / minZoom; h = H / minZoom; }
  if (box.h > h) cy = box.y + h * 0.45;
  let cx = box.x + box.w / 2;
  cx = Math.min(Math.max(cx, w / 2), bounds.W - w / 2); cy = Math.min(Math.max(cy, h / 2), bounds.H - h / 2);
  return { w, h, cx, cy };
}
// One eased value over the keys — the camera's zoom, centre and crop are all built the
// same way, so they move together. `tv` is the filter's own time variable: zoompan counts
// frames, crop reads seconds.
function pathExpr(keys, pick, M, tv) {
  const f = (v) => v.toFixed(3);
  const lerp = (a, b, k) => `(${f(a)}+(${f(b)}-${f(a)})*${k})`;
  let expr = f(pick(keys[keys.length - 1]));
  for (let i = keys.length - 2; i >= 0; i--) {
    const t1 = keys[i + 1].t, m = Math.max(0.01, Math.min(M, t1 - keys[i].t));
    const u = `(max(0,min(1,(${tv}-${f(t1 - m)})/${f(m)})))`;
    const k = `(3*pow(${u},2)-2*pow(${u},3))`;
    expr = `if(lt(${tv},${f(t1)}),${lerp(pick(keys[i]), pick(keys[i + 1]), k)},${expr})`;
  }
  return expr;
}
function zoomPath(keys, M, W, fps, out) {
  const dim = (name) => pathExpr(keys, (K) => (name === 'z' ? W / K.F.w : K.F[name]), M, `(in/${fps})`);
  return `fps=${fps},zoompan=z='${dim('z')}':x='${dim('cx')}-iw/(2*zoom)':y='${dim('cy')}-ih/(2*zoom)':d=1:s=${out.width}x${out.height}:fps=${fps}`;
}

// ── cards, in the platform's type ────────────────────────────────────────────────
let browser = null;
const fontFile = at('../../LinkedDataHub/src/main/webapp/static/com/atomgraph/linkeddatahub/css/fonts/geist.woff2');
const monoFile = at('../../LinkedDataHub/src/main/webapp/static/com/atomgraph/linkeddatahub/css/fonts/geist-mono.woff2');
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
async function cardHtml({ eyebrow, title, lede, links, note }, W, H) {
  const font = (await fs.readFile(fontFile)).toString('base64');
  const mono = (await fs.readFile(monoFile)).toString('base64');
  const k = W / 1440;
  const px = (n) => `${(n * k).toFixed(2)}px`;
  const pills = (links ?? []).map((l) => `<span class="pill${l.primary ? ' is-primary' : ''}">${esc(l.label)}</span>`).join('');
  return `<!doctype html><style>
    @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: 'Geist Mono'; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 100 900; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
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
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
    ${pills ? `<div class="actions">${pills}</div>` : ''}
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
  </div>`;
}
async function renderCard(spec, out) {
  browser ??= await chromium.launch();
  const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1 });
  await page.setContent(await cardHtml(spec, cfg.width, cfg.height));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}

// ── one clip per entry ───────────────────────────────────────────────────────────
const { width, height, fps, crf } = cfg;
const enc = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', String(fps), '-force_key_frames', 'expr:eq(n,0)', '-video_track_timescale', '90000'];
const fit = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=#0f1419,fps=${fps}`;

async function cutCard(entry, i) {
  const id = `card-${i}`;
  const kept = path.join(TMP, `${id}.mp4`);
  if (reuse && await fs.access(kept).then(() => true, () => false)) { const len = await duration(kept); return { id, kind: 'card', file: kept, len, line: null }; }
  const png = path.join(TMP, `${id}.png`);
  await renderCard({ eyebrow: entry.eyebrow, title: entry.card }, png);
  const seconds = entry.seconds ?? cfg.card.seconds, fade = cfg.card.fade;
  const out = path.join(TMP, `${id}.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(seconds), '-i', png, '-vf', `fade=t=in:st=0:d=${fade},fade=t=out:st=${(seconds - fade).toFixed(2)}:d=${fade},fps=${fps},format=yuv420p`, ...enc, out]);
  const len = await duration(out);
  console.log(`  ${id.padEnd(4)} "${entry.card}" ${len.toFixed(2)}s`);
  return { id, kind: 'card', file: out, len, line: null };
}

async function cutShot(shot) {
  const kept = path.join(TMP, `${shot.id}.mp4`);
  if (reuse && !reuse.has(shot.id) && await fs.access(kept).then(() => true, () => false)) {
    const len = await duration(kept);
    console.log(`  ${shot.id.padEnd(4)} (kept) ${len.toFixed(2)}s`);
    return { ...shot, file: kept, len, lineTake: shot.line ? voice.get(shot.line) : null };
  }
  let src = path.join(TRACKS, `${shot.track}.webm`);
  if (!(await fs.access(src).then(() => true, () => false))) src = path.join(TRACKS, `${shot.track}.mp4`);
  const bFrom = await beat(shot.track, shot.from), bTo = await beat(shot.track, shot.to);
  const same = shot.from === shot.to;
  // `fromOffset` / `toOffset` shift a shot's ends in seconds, for a beat marked after the
  // gesture it names (a form marked once open; the shot starts a moment before).
  const from = Math.max(0, bFrom.at - (same ? 0 : cfg.leadSeconds) + (shot.fromOffset ?? 0));
  const to = same ? from : bTo.at - cfg.trailSeconds + (shot.toOffset ?? 0);
  const speed = shot.speed ?? 1;
  const gesture = (to - from) / speed;
  const line = shot.line ? voice.get(shot.line) : null;
  if (shot.line && !line) throw new Error(`${shot.id}: no voice line ${shot.line}`);
  // The shot holds for its line plus the pause; the last frame is cloned for the rest.
  const want = Math.max(gesture, line ? line.seconds + cfg.lineOffset + cfg.linePad : 0, shot.hold ?? 0);
  const hold = Math.max(0, want - gesture);
  const total = gesture + hold;
  const filters = [];
  if (speed !== 1) filters.push(`setpts=PTS/${speed}`);
  if (hold > 0 && !same) filters.push(`tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)}`);
  const kind = shot.kind ?? 'page';
  if (kind === 'page' || kind === 'close') {
    // zoompan cuts its window in the INPUT's aspect, so a 16:10 take has to be cropped to
    // the film's 16:9 first (180 px off its height), or every window comes out 16:10 and
    // is squeezed into the frame. The crop is centred — 90 px off the top and the bottom
    // — except where a key's box lies in the strip it would remove: the Create dock and
    // a form's Save sit at the foot of the take, the breadcrumb at its head. Such a key
    // slides the crop to keep its box, and the crop moves between keys on the same
    // easing as the camera, so the two read as one move. Boxes are marked in take
    // pixels; each key is framed in its own crop's coordinates.
    const srcSize = cfg.source;
    const W = cfg.viewport.width, H = cfg.viewport.height;
    const centred = Math.round((srcSize.height - H) / 2);
    const cropFor = (b) => {
      if (!b || b.h > H) return centred;
      if (b.y < centred) return Math.max(0, Math.round(b.y - 24));
      if (b.y + b.h > centred + H) return Math.min(srcSize.height - H, Math.round(b.y + b.h + 24 - H));
      return centred;
    };
    const bounds = { W, H };
    const limits = { maxZoom: shot.maxZoom ?? cfg.maxZoom, minZoom: shot.minZoom ?? cfg.minZoom, pad: shot.pad ?? 0.12 };
    const key = (t, b, lim = limits) => {
      const c = cropFor(b);
      return { t, c, F: b ? frameFor({ ...b, y: b.y - c }, W, H, lim, bounds) : { w: W, h: H, cx: W / 2, cy: H / 2 } };
    };
    const box = shot.focus === false ? null : (shot.focus ?? bTo.focus ?? bFrom.focus ?? null);
    const B = key(Math.max(0.01, gesture), box);
    const keys = [shot.move === 'static' ? { ...B, t: 0 } : key(0, null)];
    if (Array.isArray(shot.via)) {
      for (const name of shot.via) {
        const b = await beat(shot.track, name).catch(() => null);
        if (!b || !b.focus) continue;
        const t = (b.at - from) / speed;
        if (t <= 0 || t >= gesture) continue;
        keys.push(key(t, b.focus, { ...limits, maxZoom: Math.max(limits.maxZoom, 1.6) }));
      }
    }
    keys.push(B);
    const M = shot.moveSeconds ?? 1.2;
    filters.push(`crop=${W}:${H}:0:'${pathExpr(keys, (K) => K.c, M, 't')}'`);
    filters.push(zoomPath(keys, M, W, fps, { width, height }));
  } else if (kind === 'terminal') {
    filters.push(fit);
  } else if (kind === 'phone') {
    filters.push(fit);
  }
  filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`, `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=#0f1419`, `fps=${fps}`);
  const out = path.join(TMP, `${shot.id}.mp4`);
  if (!same) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-to', String(to), '-i', src, '-vf', filters.join(','), ...enc, out]);
  } else {
    const png = path.join(TMP, `${shot.id}.png`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-i', src, '-frames:v', '1', png]);
    const still = filters.filter((f) => !f.startsWith('tpad') && !f.startsWith('setpts')).join(',');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(total), '-i', png, '-vf', still, ...enc, out]);
  }
  const len = await duration(out);
  console.log(`  ${shot.id.padEnd(4)} ${shot.track.padEnd(28)} ${String(shot.from).padEnd(16)}→ ${String(shot.to).padEnd(16)} ${gesture.toFixed(1)}s${speed !== 1 ? ' at ' + speed + '×' : ''}${hold ? ` + ${hold.toFixed(1)}s hold` : ''} = ${len.toFixed(2)}s${line ? `   line ${shot.line} ${line.seconds.toFixed(1)}s` : ''}`);
  return { ...shot, file: out, len, lineTake: line };
}

const clips = [];
for (const [i, entry] of cfg.shots.entries()) {
  if (entry.card) { if (!only) clips.push(await cutCard(entry, i)); continue; }
  if (only && !only.has(entry.id)) continue;
  clips.push(await cutShot(entry));
}
if (browser) await browser.close();

// ── the timeline ────────────────────────────────────────────────────────────────
let t = 0; const timeline = [];
for (const c of clips) { timeline.push({ id: c.id, in: Number(t.toFixed(3)), out: Number((t + c.len).toFixed(3)), line: c.line ?? null, lineAt: c.lineTake ? Number((t + cfg.lineOffset).toFixed(3)) : null }); t += c.len; }
const total = t;
const list = path.join(TMP, 'concat.txt');
await fs.writeFile(list, clips.map((c) => `file '${path.resolve(c.file)}'`).join('\n') + '\n');
const silent = path.join(TMP, 'video.mp4');
await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

// The closing card: faded in over the last shot's hold, after its line's first sentence.
let video = silent;
if (cfg.slide && !only) {
  const close = timeline.findLast((x) => x.id === 'Z1');
  if (close) {
    const png = path.join(TMP, 'slide.png');
    browser = await chromium.launch();
    await renderCard(cfg.slide, png);
    await browser.close();
    const fadeAt = close.in + (cfg.slide.at ?? 3.0), fade = cfg.slide.fade ?? 1.2;
    const withSlide = path.join(TMP, 'video-slide.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-loop', '1', '-framerate', String(fps), '-t', String(total), '-i', png,
      '-filter_complex', `[1]format=rgba,fade=t=in:st=${fadeAt.toFixed(3)}:d=${fade}:alpha=1[sl];[0][sl]overlay=0:0:format=auto[v]`, '-map', '[v]', ...enc, withSlide]);
    video = withSlide;
  }
}

// ── sound ───────────────────────────────────────────────────────────────────────
const out = at(cfg.output.replace(/\.mp4$/, only ? '-part.mp4' : '.mp4'));
const lines = timeline.filter((x) => x.lineAt != null).map((x) => ({ ...x, take: voice.get(x.line) }));
if (noAudio || !lines.length) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', '-movflags', '+faststart', out]);
} else {
  const inputs = ['-i', video];
  const parts = [];
  lines.forEach((l, i) => { inputs.push('-i', l.take.file); parts.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(l.lineAt * 1000)}|${Math.round(l.lineAt * 1000)},apad[l${i}]`); });
  // The chapter tone, once per card, at the card's start — the one sound the film adds
  // that the interface does not make, and it marks structure rather than a gesture.
  const toneFile = cfg.tone?.file ? at(cfg.tone.file) : null;
  const cards = timeline.filter((x) => x.id.startsWith('card-'));
  const hasTone = toneFile && cards.length && await fs.access(toneFile).then(() => true, () => false);
  const tones = [];
  if (hasTone) cards.forEach((c, j) => { const idx = inputs.length / 2; inputs.push('-i', toneFile); parts.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${cfg.tone.gain ?? -6}dB,adelay=${Math.round((c.in + 0.3) * 1000)}|${Math.round((c.in + 0.3) * 1000)},apad[t${j}]`); tones.push(`[t${j}]`); });
  parts.push(`${lines.map((_, i) => `[l${i}]`).join('')}${tones.join('')}amix=inputs=${lines.length + tones.length}:normalize=0:dropout_transition=0,atrim=0:${total.toFixed(3)},asplit=2[voice][key]`);
  let mixIn = '[voice]';
  const musicFile = cfg.music?.file ? at(cfg.music.file) : null;
  const hasMusic = musicFile && await fs.access(musicFile).then(() => true, () => false);
  if (hasMusic) {
    const m = cfg.music; const idx = inputs.length / 2;
    inputs.push('-stream_loop', '-1', '-i', musicFile);
    parts.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total.toFixed(3)},volume=${m.gain ?? -20}dB,afade=t=out:st=${(total - (m.fadeOut ?? 2)).toFixed(3)}:d=${m.fadeOut ?? 2}[m]`);
    parts.push(`[m][key]sidechaincompress=threshold=0.02:ratio=8:attack=60:release=600:makeup=1[md]`);
    parts.push(`[voice][md]amix=inputs=2:normalize=0:dropout_transition=0[mix]`);
    mixIn = '[mix]';
  } else {
    parts.push(`[key]anullsink`);
  }
  parts.push(`${mixIn}loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(total - 1).toFixed(3)}:d=1[a]`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  console.log(`  sound: ${lines.length} lines${hasMusic ? ', music ducked under them' : ', no music file yet'}, loudness −14 LUFS`);
}

// ── subtitles ───────────────────────────────────────────────────────────────────
const srtTime = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000), r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`; };
const cues = [];
for (const l of lines) {
  // Cues break at sentence ends, timed from the alignment the voice take came with: the
  // spoken text differs from the written one only in the respellings, so the sentence
  // boundaries line up by count.
  const al = await alignmentOf(l.take);
  const chars = al.characters, starts = al.character_start_times_seconds, ends = al.character_end_times_seconds;
  const spokenSentences = l.take.spoken.split(/(?<=[.!?])\s+/);
  const writtenSentences = l.take.text.split(/(?<=[.!?])\s+/);
  let pos = 0;
  spokenSentences.forEach((s, i) => {
    const start = pos, end = pos + s.length - 1;
    const t0 = starts[Math.min(start, chars.length - 1)] ?? 0, t1 = ends[Math.min(end, chars.length - 1)] ?? l.take.seconds;
    cues.push({ from: l.lineAt + t0, to: l.lineAt + t1, text: writtenSentences[i] ?? s });
    pos = end + 1; while (pos < chars.length && chars[pos] === ' ') pos++;
  });
}
await fs.writeFile(out.replace(/\.mp4$/, '.srt'), cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join('\n'));
await fs.writeFile(out.replace(/\.mp4$/, '.marks.json'), JSON.stringify({ output: out, duration: Number(total.toFixed(3)), shots: timeline }, null, 2));
await run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', 'fps=1/8,scale=384:-2,tile=6x8', '-frames:v', '1', '-update', '1', out.replace(/\.mp4$/, '-sheet.jpg')]);
console.log(`→ ${path.relative(ROOT, out)}  ${(total / 60).toFixed(1)} min, ${clips.length} clips, ${cues.length} subtitle cues`);
