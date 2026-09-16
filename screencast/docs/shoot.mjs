// Shoots the docs placeholders from the manifest.
//
// Stills and clips are captured the same way the scenario scenes are — same cursor,
// same geometry, same cookie — but with docs discipline: one context per shot so a
// failure costs one asset, the pointer hidden for stills because a documentation
// screenshot should not show a cursor that is not really there, and output named by
// the document it belongs to rather than by scene.
//
// Writes an index.json recording slot, caption, file and outcome, which is what the
// fill step will later read. Nothing here touches a .ttl.
//
//   node docs/shoot.mjs --base … --cert-file … --cert-password-file … [--only browse]

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { args, identityFor, ROOT, sleep } from '../lib/harness.mjs';
import { CURSOR_INIT, makeCursor, withCursorHidden } from '../lib/cursor.mjs';
import { Marks } from '../lib/marks.mjs';
import { resetContainer, resetDocument, removeAll } from '../lib/fixture.mjs';
import { makeTyper } from '../lib/typing.mjs';
import * as nav from '../lib/nav.mjs';
import * as modes from '../lib/modes.mjs';
import * as blocks from '../lib/blocks.mjs';
import { SHOTS } from './manifest.mjs';

const OUT = path.join(ROOT, 'docs', 'out');
const opts = args();
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const GEOMETRY = { width: opts.width ?? 1440, height: opts.height ?? 810, scale: opts.scale ?? 2 };

const run = (cmd, a) => new Promise((res) => {
  const p = spawn(cmd, a); let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('error', (e) => res({ code: -1, err: e.message }));
  p.on('close', (code) => res({ code, err }));
});

// A shot OF a block is a shot of that block. `of` names the subject element — a
// selector or a function returning a locator — and the frame becomes its box, so a
// picture captioned "a chart block" does not spend half its pixels on the navbar,
// the action bar and whatever block happens to sit above. Playwright's element
// screenshot handles the scrolling itself, which matters because LDH panes scroll
// internally and page coordinates would not line up.
//
// `pad` breathes a few pixels around the box, for a subject whose meaning spills
// past its own border — a popover anchored to a block, a toolbar floating above it.
// Padded shots fall back to a viewport clip, clamped so the box cannot run off frame.
// Sticky chrome paints OVER an element capture. Playwright scrolls the subject into
// view and shoots its box, and LDH's header, action bar and create dock are sticky —
// so a picture of a block came back with the navbar across its top and the dock across
// its bottom, which is the very thing framing the block was meant to remove. Hide every
// fixed/sticky element that is neither the subject, nor inside it, nor containing it;
// a chrome shot (`of: '.ldh-header'`) therefore keeps its own subject visible.
const withoutStickyChrome = async (page, targets, take) => {
  const handles = [];
  for (const t of targets) handles.push(await t.elementHandle());
  await page.evaluate((keep) => {
    window.__shotHidden = [];
    for (const e of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(e).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      // EVERY subject is spared, not just the first: a frame spanning the header and
      // the tab bar hid the tab bar, because the tab bar is sticky too and only the
      // first element of the pair was being protected.
      if (keep.some((k) => k && (e === k || e.contains(k) || k.contains(e)))) continue;
      window.__shotHidden.push([e, e.style.visibility]);
      e.style.visibility = 'hidden';
    }
  }, handles);
  try {
    return await take();
  } finally {
    await page.evaluate(() => {
      (window.__shotHidden || []).forEach(([e, v]) => { e.style.visibility = v; });
      window.__shotHidden = null;
    });
  }
};

const locate = (page, of) => (typeof of === 'function' ? of(page) : page.locator(of).first());

const shootSubject = async (page, shot, file, geometry) => {
  // An array frames the box enclosing all of them, for a subject that is not one
  // element: the rich-text toolbar renders at pane level, outside the block it edits,
  // so "the toolbar above an active block" is the union of the two.
  if (Array.isArray(shot.of)) {
    const boxes = [], subjects = [];
    for (const one of shot.of) {
      const el = await locate(page, one);
      subjects.push(el);
      await el.scrollIntoViewIfNeeded();
      // PAGE coordinates, read in the same breath as the rect. Scrolling to the second
      // subject moves the first one's viewport rect, so boxes measured at different
      // scroll positions cannot be unioned — that silently framed one block instead of
      // two, twice.
      const box = await el.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
      });
      if (!box || !box.width) throw new Error(`of: matched nothing to frame (${one})`);
      boxes.push(box);
    }
    await page.waitForTimeout(500);
    // Page coordinates and a full-page capture, because a union of two blocks is
    // routinely taller than the viewport — clamping it to the fold cut the second
    // subject off, which defeats the point of spanning them.
    const pad = shot.pad ?? 0;
    const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
    const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
    const clip = {
      x, y,
      width: Math.max(...boxes.map((b) => b.x + b.width)) + pad - x,
      height: Math.max(...boxes.map((b) => b.y + b.height)) + pad - y,
    };
    return withoutStickyChrome(page, subjects, () =>
      page.screenshot({ path: file, clip, fullPage: true }));
  }

  const target = await locate(page, shot.of);
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  if (!shot.pad) return withoutStickyChrome(page, [target], () => target.screenshot({ path: file }));

  const box = await target.boundingBox();
  if (!box) throw new Error('of: matched nothing to frame');
  const x = Math.max(0, box.x - shot.pad), y = Math.max(0, box.y - shot.pad);
  const clip = {
    x, y,
    width: Math.min(box.width + shot.pad * 2, geometry.width - x),
    height: Math.min(box.height + shot.pad * 2, geometry.height - y),
  };
  return withoutStickyChrome(page, [target], () => page.screenshot({ path: file, clip }));
};

const browser = await chromium.launch({ headless: !opts.headed });
const index = [];
const onlyParts = only ? only.split(',').map((o) => o.trim()).filter(Boolean) : null;
const wanted = SHOTS.filter((s) => !onlyParts || onlyParts.some((o) => `${s.doc}/${s.n}`.includes(o)));

console.log(`\n${wanted.length} shot(s) — ${wanted.filter((s) => !s.blocked).length} to take\n`);

// A shot that documents an act of authoring has to write somewhere, and the demo data
// is not it. `writes: true` opts a shot into a scratch container this run provisions and
// removes — so nothing depends on a document an earlier session happened to leave behind,
// and nothing is left for somebody to puzzle over later.
const SCRATCH = 'docs-shots';
const creds = {
  ldh: opts.ldh, base: opts.base, certFile: opts.certFile,
  certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
};
const made = [];
let scratch = null;
if (wanted.some((s) => s.writes && !s.blocked)) {
  const url = await resetContainer({ ...creds, slug: SCRATCH, title: 'Documentation shots' });
  scratch = {
    url,
    async document(slug, title) {
      const d = await resetDocument({ ...creds, container: url.replace(/\/$/, ''), slug, title });
      made.push(d.url);
      return d.url;
    },
  };
  console.log(`scratch: ${url}`);
}


for (const shot of wanted) {
  const slug = `${shot.doc.replace(/\//g, '-')}-${shot.n}`;
  const record = { doc: shot.doc, n: shot.n, line: shot.line, kind: shot.kind, caption: shot.caption, slug };
  if (shot.note) record.note = shot.note;

  if (shot.blocked) {
    console.log(`  ⊘ ${slug.padEnd(42)} ${shot.blocked}`);
    index.push({ ...record, outcome: 'blocked', why: shot.blocked });
    continue;
  }

  const dir = path.join(OUT, path.dirname(shot.doc));
  await fs.mkdir(dir, { recursive: true });

  const identity = shot.anonymous ? null : await identityFor(opts);
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: GEOMETRY.width, height: GEOMETRY.height },
    deviceScaleFactor: GEOMETRY.scale,
    permissions: ['clipboard-read', 'clipboard-write'],
    ...(identity ? { clientCertificates: identity } : {}),
    ...(shot.kind === 'clip'
      ? { recordVideo: { dir: OUT, size: { width: GEOMETRY.width, height: GEOMETRY.height } } }
      : {}),
  });
  await context.addCookies([
    { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(opts.base).hostname, path: '/' },
  ]);
  await context.addInitScript(CURSOR_INIT);

  const page = await context.newPage();
  const cursor = makeCursor(page);
  // The same human-paced typer the scenes use, so a shot that fills a field goes
  // through the app's own input handling rather than setting a value behind its back.
  const { type, typeCode } = makeTyper(page);
  const marks = new Marks(slug).start();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 90)));

  let outcome = 'ok', why;
  try {
    await page.goto(opts.base + shot.at, { waitUntil: 'load' });
    await page.waitForTimeout(shot.settle ?? 5000);
    if (shot.act) await shot.act({ page, cursor, type, typeCode, marks, nav, modes, blocks, sleep, scratch });
    await page.waitForTimeout(1200);

    // The caption is the contract. Without this the runner only ever proved that
    // act() did not throw, which passed three byte-identical stills as shot.
    if (shot.want) {
      const met = typeof shot.want === 'function'
        ? await shot.want(page)
        : (await page.locator(shot.want).count()) > 0;
      if (!met) { outcome = 'missed'; why = `nothing matched what the caption promises`; }
    }

    if (shot.after) await shot.after(page);

    if (shot.kind === 'still') {
      const file = path.join(dir, `${path.basename(shot.doc)}-${shot.n}.png`);
      await withCursorHidden(page, () => shot.of
        ? shootSubject(page, shot, file, GEOMETRY)
        : page.screenshot({ path: file, clip: shot.clip, fullPage: shot.fullPage ?? false }));
      record.file = path.relative(ROOT, file);
    }
  } catch (e) {
    outcome = 'failed';
    why = e.message.split('\n')[0].slice(0, 110);
  }

  const video = page.video();
  await context.close();

  if (shot.kind === 'clip' && video) {
    const webm = path.join(dir, `${path.basename(shot.doc)}-${shot.n}.webm`);
    await video.saveAs(webm).catch(() => {});
    await video.delete().catch(() => {});
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    const paced = await run('node', [path.join(ROOT, 'render', 'pace.mjs'), webm, mp4, '--dwell', '3', '--crf', '20']);
    record.file = path.relative(ROOT, paced.code === 0 ? mp4 : webm);
    record.duration = Number(marks.elapsed.toFixed(1));
  }

  record.outcome = outcome;
  if (why) record.why = why;
  if (errors.length) record.pageErrors = errors.length;
  index.push(record);

  const mark = { ok: '✓', missed: '~', failed: '✗' }[outcome];
  console.log(`  ${mark} ${slug.padEnd(42)} ${record.file ?? ''} ${why ?? ''}`);
}

// Teardown: what the runner made, then what a shot said it would leave behind through
// the UI (the runner cannot see those), then the container.
if (scratch) {
  const declared = wanted.flatMap((s) => (s.creates ?? []).map((slug) => `${scratch.url.replace(/\/$/, '')}/${slug}/`));
  const gone = await removeAll({ ...creds, urls: [...made, ...declared, scratch.url] });
  console.log(`scratch removed: ${gone.filter(([, ok]) => ok).length}/${gone.length}`);
}

await browser.close();
// A --only run refreshes the slots it took and leaves the rest of the index alone,
// so iterating on three shots does not discard the other forty-one.
const indexFile = path.join(OUT, 'index.json');
const prior = await fs.readFile(indexFile, 'utf8').then(JSON.parse).catch(() => []);
const merged = [...prior];
for (const r of index) {
  const i = merged.findIndex((x) => x.doc === r.doc && x.n === r.n);
  if (i >= 0) merged[i] = r; else merged.push(r);
}
merged.sort((a, b) => SHOTS.findIndex((s) => s.doc === a.doc && s.n === a.n) - SHOTS.findIndex((s) => s.doc === b.doc && s.n === b.n));
await fs.writeFile(indexFile, JSON.stringify(merged, null, 2) + '\n');

// Two stills of different things that are byte-identical mean one of them did not
// happen. Cheap to check, and it is what exposed the first pass as green-but-wrong.
const seen = new Map();
for (const r of index) {
  if (!r.file || !r.file.endsWith('.png')) continue;
  const sum = createHash('md5').update(await fs.readFile(path.join(ROOT, r.file))).digest('hex');
  if (seen.has(sum)) {
    r.duplicateOf = seen.get(sum);
    if (r.outcome === 'ok') { r.outcome = 'missed'; r.why = `byte-identical to ${seen.get(sum)}`; }
  } else seen.set(sum, r.slug);
}

const tally = (o) => index.filter((r) => r.outcome === o);
console.log(`\n${tally('ok').length} shot, ${tally('missed').length} missed, ${tally('failed').length} failed, ${tally('blocked').length} blocked`);
for (const f of [...tally('missed'), ...tally('failed')]) console.log(`  ${f.outcome === 'missed' ? '~' : '✗'} ${f.slug}: ${f.why}`);
console.log(`\nindex: ${path.relative(ROOT, path.join(OUT, 'index.json'))}\n`);
