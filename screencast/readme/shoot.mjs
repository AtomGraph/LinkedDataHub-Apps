// Shoots the demo pictures the repository README shows.
//
// The README's screenshots are of three dataspaces, not one, so the base is a pattern:
// `{app}` is replaced by each shot's demo folder name, and the shot list stays free of
// hostnames the same way the docs manifest does.
//
// Same discipline as docs/shoot.mjs — one context per shot, `want` asserted before the
// capture, the pointer hidden in stills — with two differences. The output goes
// straight into the demo folders under the names the README already links (and each
// demo's .ldhignore already skips), because nothing content-addresses these files. And
// the Northwind picture is an animated GIF, since a README on GitHub plays no <video>
// from the repository.
//
//   node readme/shoot.mjs --base 'https://{app}.demo.localhost' --cert-file … --cert-password-file … [--only copenhagen]

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { args, identityFor, ROOT, sleep } from '../lib/harness.mjs';
import { CURSOR_INIT, makeCursor, withCursorHidden } from '../lib/cursor.mjs';
import * as modes from '../lib/modes.mjs';
import * as map from '../lib/map.mjs';

const REPO = path.resolve(ROOT, '..');
const OUT = path.join(ROOT, 'readme', 'out');
const opts = args();
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const GEOMETRY = { width: 1440, height: 900, scale: 2 };
// What ships: stills at 1920 wide, the GIF at 960 and 12 fps. A README column is ~880px,
// so that is 2x for the stills, and the GIF is the size its frame count can afford.
const STILL_WIDTH = 1920;
const GIF_WIDTH = 960;
const GIF_FPS = 12;

// Scrolls a subject up to just below the sticky navbar and action bar, so a picture of a
// block opens on the block rather than on the document's heading.
const underChrome = async (locator, gap = 132) => {
  await locator.evaluate((e, gap) => {
    let s = e.parentElement;
    while (s && !(/(auto|scroll)/.test(getComputedStyle(s).overflowY) && s.scrollHeight > s.clientHeight)) s = s.parentElement;
    const top = e.getBoundingClientRect().top;
    if (s) s.scrollBy(0, top - s.getBoundingClientRect().top - gap);
    else window.scrollBy(0, top - gap);
  }, gap);
  await sleep(800);
};

// The OUTER row carrying a view: scrolling to the inner one cuts the carrier's own bar
// in half under the sticky chrome.
const viewBlock = (page, title) =>
  page.locator('.ldh-block-row').filter({ has: page.locator('.ldh-view-toolbar') }).filter({ hasText: title }).first();

// Waits for the concept tree to reveal the open concept. The page does it on load: it expands the
// path from the scheme down to every occurrence of the concept, marks them, and scrolls the tree to
// centre the first one - which moves as the branches of a polyhierarchy finish in whatever order,
// so the wait is for the scroll position to hold still, not for the first mark. All of it needs the
// package's client rules, i.e. a composed client SEF: without one the tree stops at "Loading…".
const revealed = async (page) => {
  await page.locator('.concept-tree li.is-active').first().waitFor({ state: 'attached', timeout: 45000 });
  let last = -1;
  for (let still = 0; still < 3; ) {
    await sleep(1000);
    const now = await page.locator('ul.concept-tree').first().evaluate((t) => t.scrollTop);
    still = now === last ? still + 1 : 0;
    last = now;
  }
};

// The open concept's row is inside the tree's visible area.
const activeInView = (page) => page.locator('ul.concept-tree').first().evaluate((tree) => {
  const row = tree.querySelector('li.is-active > div');
  if (!row) return false;
  const t = tree.getBoundingClientRect(), r = row.getBoundingClientRect();
  return r.top >= t.top && r.bottom <= t.bottom;
});

export const SHOTS = [
  {
    app: 'northwind-traders', kind: 'gif', file: 'demo/northwind-traders/screenshot.gif',
    caption: 'Set-based (parallax) navigation',
    at: '/products/',
    async prepare({ page }) {
      await underChrome(viewBlock(page, 'All products'));
    },
    // From the product table to the suppliers of those products, in one pivot.
    async act({ page, cursor }) {
      await sleep(1200);
      await modes.showControls(page, cursor);
      await sleep(1200);
      const pill = page.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Provider' }).first();
      await cursor.click(pill);
      await page.locator('.parallax-step').first().waitFor({ state: 'visible', timeout: 15000 });
      // Off the re-rendered pills and onto the results, so the loop ends on what it found.
      const { width, height } = page.viewportSize();
      await cursor.moveTo(width * 0.72, height * 0.78, { duration: 900 });
      await sleep(3000);
    },
    want: '.parallax-step',
  },
  {
    app: 'copenhagen', kind: 'still', file: 'demo/copenhagen/screenshot.png',
    caption: 'City Graph geospatial view',
    at: '/schools/',
    // The map filling the frame. A marker's info window is a card as wide as the map
    // itself, so opening one hides the very thing the picture is of.
    async act({ page }) {
      await underChrome(viewBlock(page, 'All schools'));
      const found = await map.findMarkers(page);
      if (!found.markers?.length) throw new Error(found.error ?? 'no markers on the map');
      await sleep(1500);
    },
    want: '.ol-viewport',
  },
  {
    app: 'unesco-thesaurus', kind: 'still', file: 'demo/unesco-thesaurus/screenshot.png',
    caption: 'SKOS viewer',
    at: '/concepts/concept7367/',
    // Denmark's labels in five languages and its broader concepts, beside the concept tree
    // revealing it: under EEC countries, the first of its five parents, centred in the tree.
    async act({ page }) {
      await revealed(page);
    },
    want: activeInView,
  },
  {
    app: 'unesco-thesaurus', kind: 'still', file: 'demo/unesco-thesaurus/screenshot-edit-mode.png',
    caption: 'SKOS editor',
    at: '/concepts/concept7367/',
    // The same page in edit mode, the tree revealing the concept beside the form as beside the view.
    async act({ page, cursor }) {
      await revealed(page);
      const head = page.locator('.ldh-block-row').filter({ hasText: 'Denmark' }).first();
      await cursor.click(head.locator('button').filter({ hasText: 'edit' }).first());
      await page.locator('form:visible').first().waitFor({ state: 'visible', timeout: 15000 });
      await sleep(2500);
    },
    want: async (page) => (await page.locator('form:visible').count()) > 0
      && await activeInView(page),
  },
];

const run = (cmd, a) => new Promise((res) => {
  const p = spawn(cmd, a); let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('error', (e) => res({ code: -1, err: e.message }));
  p.on('close', (code) => res({ code, err }));
});

const baseFor = (app) => opts.base.replace('{app}', app);

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: !opts.headed });
const wanted = SHOTS.filter((s) => !only || only.split(',').some((o) => s.file.includes(o.trim())));
const results = [];

for (const shot of wanted) {
  const base = baseFor(shot.app);
  const identity = opts.anonymous ? null : await identityFor({ ...opts, base });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: GEOMETRY.width, height: GEOMETRY.height },
    deviceScaleFactor: GEOMETRY.scale,
    ...(identity ? { clientCertificates: identity } : {}),
    ...(shot.kind === 'gif'
      ? { recordVideo: { dir: OUT, size: { width: GEOMETRY.width, height: GEOMETRY.height } } }
      : {}),
  });
  await context.addCookies([
    { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
  ]);
  await context.addInitScript(CURSOR_INIT);

  const page = await context.newPage();
  const started = Date.now();
  const cursor = makeCursor(page);
  const master = path.join(OUT, shot.file.replace(/\.[a-z]+$/, '').replace(/\//g, '-') + (shot.kind === 'gif' ? '.webm' : '.png'));
  let outcome = 'ok', why, from = 0;
  try {
    await page.goto(base + shot.at, { waitUntil: 'load' });
    await page.waitForTimeout(shot.settle ?? 6000);
    if (shot.prepare) await shot.prepare({ page, cursor });
    // A clip starts where the gesture does: the page load in front of it is cut.
    from = (Date.now() - started) / 1000;
    await shot.act({ page, cursor });
    const met = typeof shot.want === 'function' ? await shot.want(page) : (await page.locator(shot.want).count()) > 0;
    if (!met) { outcome = 'missed'; why = 'nothing matched what the caption promises'; }
    if (shot.kind === 'still') await withCursorHidden(page, () => page.screenshot({ path: master }));
  } catch (e) {
    outcome = 'failed';
    why = e.message.split('\n')[0].slice(0, 110);
  }
  const video = page.video();
  await context.close();
  if (video) {
    if (shot.kind === 'gif') await video.saveAs(master).catch(() => {});
    await video.delete().catch(() => {});
  }

  if (outcome === 'ok') {
    const dest = path.join(REPO, shot.file);
    const derived = shot.kind === 'gif'
      ? await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(2), '-i', master, '-vf',
        `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
        dest])
      : await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vf', `scale=${STILL_WIDTH}:-1:flags=lanczos`, dest]);
    if (derived.code !== 0) { outcome = 'failed'; why = `ffmpeg: ${derived.err.trim().split('\n').pop()}`; }
  }

  results.push({ file: shot.file, outcome, why });
  console.log(`  ${{ ok: '✓', missed: '~', failed: '✗' }[outcome]} ${shot.file.padEnd(48)} ${why ?? ''}`);
}

await browser.close();
const bad = results.filter((r) => r.outcome !== 'ok');
console.log(`\n${results.length - bad.length} shot, ${bad.length} not\n`);
process.exit(bad.length ? 1 : 0);
