// The phone-width half of E4, as a take of its own.
//
// Not through the harness's video: Playwright records the viewport in CSS pixels, so a
// 390×844 phone comes out at 390×844 however the device scale is set, and a wider
// viewport zoomed 2× lays out as a tablet, since media queries read the viewport. The
// page is laid out as a real 390×844 phone at device scale 2 and captured as a run of
// 2× screenshots instead, which ffmpeg assembles into the track at 25 fps; the marks
// sidecar is written the same way the harness writes it, so the cut reads it as any take.
//
// Light, to contrast with the dark desktop frame it sits beside. The territories page,
// the one E4's desktop half ends on, scrolled slowly down through the map.
//
//   node scenes/overview-e-phone.mjs --base … --cert-file … --cert-password-file …
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { resolve, TRACKS, sleep } from '../lib/harness.mjs';

const ID = 'overview-e-phone';
const FPS = 25, SECONDS = 18, SCROLL = 900;
const opts = await resolve('/territories/');
const { target, identity } = opts;
const frames = path.join(TRACKS, `.${ID}`);
await fs.rm(frames, { recursive: true, force: true });
await fs.mkdir(frames, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  colorScheme: 'light', ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(target).hostname, path: '/' }]);
const page = await context.newPage();
await page.goto(target, { waitUntil: 'load' });
await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 40_000 });
await sleep(4000);

// The scroll is driven frame by frame, so each screenshot is one step of an ease and the
// run reads as a glide whatever a screenshot costs.
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const n = FPS * SECONDS;
// a slow glide: the line over it runs about seventeen seconds
const holdIn = FPS * 1.5, glide = FPS * 15;
const beats = [{ beat: 'E4-phone-start', at: 0, note: 'the territories page at phone width' }];
for (let i = 0; i < n; i++) {
  const u = Math.min(1, Math.max(0, (i - holdIn) / glide));
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(SCROLL * ease(u)));
  await page.screenshot({ path: path.join(frames, `${String(i).padStart(4, '0')}.png`) });
}
beats.push({ beat: 'E4-phone-end', at: (holdIn + glide) / FPS, note: 'scrolled through the map' }, { beat: 'end', at: n / FPS });
await browser.close();

const track = path.join(TRACKS, `${ID}.webm`);
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%04d.png'), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '20', '-pix_fmt', 'yuv420p', track], { stdio: 'inherit' });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`))));
});
await fs.writeFile(path.join(TRACKS, `${ID}.marks.json`), JSON.stringify({ scene: ID, track: ID, duration: n / FPS, beats }, null, 2));
await fs.rm(frames, { recursive: true, force: true });
console.log(`  track  ${track}\n  length ${n / FPS}s over ${beats.length} beats (${n} frames at ${FPS} fps, 780×1688)`);
