// One harness, many scenes. Target, identity and geometry are per-scene parameters
// rather than constants, so the same code renders a full-width clip for the
// scenario series and a 960-wide pane for the split-screen teaser later.
//
// A scene produces *tracks*, not a video: one media file plus one marks sidecar
// per track. Today every scene emits exactly one. Assembly is a separate,
// manifest-driven step that never learns how a track was produced.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CURSOR_INIT, makeCursor, withCursorHidden } from './cursor.mjs';
import { makeTyper } from './typing.mjs';
import { Marks } from './marks.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const TRACKS = path.join(ROOT, 'tracks');
export const SHOTS = path.join(ROOT, 'shots');

export const DEFAULT_BASE = 'https://localhost:4443';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Nothing here knows where any repository lives. Paths and origins arrive as
// arguments or environment; the Makefile carries the local defaults, where they
// can be overridden without touching code.
export const USAGE = `
  --base URL              origin to film        (env LDH_BASE, default ${DEFAULT_BASE})
  --cert-file PATH        PKCS12 keystore       (env LDH_CERT_FILE)
  --cert-password SECRET  keystore password     (env LDH_CERT_PASSWORD)
  --cert-password-file P  read the password from a file instead
  --anonymous             no client certificate at all
  --headed                run with a visible browser
  --slowmo MS             slow every action down, for authoring
  --take N                suffix the track so takes do not overwrite
  --shots                 also write a PNG at every beat, into shots/<scene>/
  --full-page             make those stills full-page rather than viewport
  --no-video              stills only; skip the video recording entirely
  --ldh PATH              the ldh CLI, for scenes that reset a fixture document
                          (env LDH_BIN, default: whatever resolves on PATH)
`;

export function args() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
  };

  // --origin is accepted as an alias so the flag reads naturally in a scene, but
  // --base is the name the ldh CLI uses and the one the env var follows.
  const base = value('base', value('origin', process.env.LDH_BASE ?? DEFAULT_BASE)).replace(/\/$/, '');

  return {
    base,
    certFile: value('cert-file', process.env.LDH_CERT_FILE ?? null),
    certPassword: value('cert-password', process.env.LDH_CERT_PASSWORD ?? null),
    certPasswordFile: value('cert-password-file', process.env.LDH_CERT_PASSWORD_FILE ?? null),
    anonymous: flag('anonymous'),
    headed: flag('headed'),
    slowMo: Number(value('slowmo', 0)),
    take: value('take', null),
    ldh: value('ldh', process.env.LDH_BIN ?? 'ldh'),
    shots: flag('shots'),
    fullPage: flag('full-page'),
    video: !flag('no-video'),
    // The app centres a ~1230px content column, so a 1920 frame is mostly margin.
    // Geometry is a flag so framing can be judged on playback rather than guessed.
    width: Number(value('width', 0)) || null,
    height: Number(value('height', 0)) || null,
    scale: Number(value('scale', 0)) || null,
  };
}

export function geometryFrom(a, fallback = { width: 1920, height: 1080, deviceScaleFactor: 2 }) {
  return {
    width: a.width ?? fallback.width,
    height: a.height ?? fallback.height,
    deviceScaleFactor: a.scale ?? fallback.deviceScaleFactor,
  };
}

export async function identityFor({ base, certFile, certPassword, certPasswordFile }) {
  if (!certFile) throw new Error(`no certificate for ${base} — pass --cert-file, or --anonymous for a public dataspace${USAGE}`);
  const passphrase = certPassword ?? (certPasswordFile
    ? (await fs.readFile(certPasswordFile, 'utf8')).trim()
    : null);
  if (passphrase === null) throw new Error(`no password for ${certFile} — pass --cert-password or --cert-password-file${USAGE}`);
  return [{ origin: base, pfxPath: certFile, passphrase }];
}

// What every scene and probe calls to turn flags into a usable target.
export async function resolve(pathname = '/') {
  const a = args();
  return {
    ...a,
    target: a.base + pathname,
    identity: a.anonymous ? null : await identityFor(a),
  };
}

export async function runScene({
  id,
  target,
  identity = null,
  geometry = { width: 1920, height: 1080, deviceScaleFactor: 2 },
  overlays = { cursor: true },
  body,
}) {
  const opts = args();
  const trackName = opts.take ? `${id}-take${opts.take}` : id;

  await fs.mkdir(TRACKS, { recursive: true });

  const browser = await chromium.launch({ headless: !opts.headed, slowMo: opts.slowMo });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: geometry.width, height: geometry.height },
    deviceScaleFactor: geometry.deviceScaleFactor ?? 2,
    ...(opts.video
      ? { recordVideo: { dir: TRACKS, size: { width: geometry.width, height: geometry.height } } }
      : {}),
    ...(identity ? { clientCertificates: identity } : {}),
    // A scene copies a resource's URI from the app rather than knowing it, so the
    // clipboard is part of the workflow, not a convenience.
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  // A fresh profile gets the first-time message modal, whose backdrop swallows every
  // click in the page. It is dismissed by a cookie (client.xsl:216, modal.xsl:720),
  // so seeding it is cheaper and cleaner than filming a dismissal in every scene.
  const { hostname } = new URL(target);
  await context.addCookies([
    { name: 'LinkedDataHub.first-time-message', value: 'true', domain: hostname, path: '/' },
  ]);

  // The recording starts with the context, so the clock does too.
  const marks = new Marks(id).start();
  console.log(`\n▶ ${id}  →  ${target}`);

  if (overlays.cursor) await context.addInitScript(CURSOR_INIT);

  const page = await context.newPage();
  const cursor = makeCursor(page);

  // Stills are a by-product of filming: the docs carry 33 unfilled placeholders and
  // a beat boundary is where the action has settled, so it is the right frame.
  const shotDir = path.join(SHOTS, trackName);
  let shotCount = 0;
  const shot = async (name, { full = opts.fullPage } = {}) => {
    await fs.mkdir(shotDir, { recursive: true });
    const file = path.join(shotDir, `${String(++shotCount).padStart(2, '0')}-${String(name).replace(/[^\w.-]+/g, '-')}.png`);
    await withCursorHidden(page, () => page.screenshot({ path: file, fullPage: full }));
    return path.relative(ROOT, file);
  };
  if (opts.shots) marks.attach((id) => shot(id));
  const { type, typeCode } = makeTyper(page);

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  let failure = null;
  try {
    await body({ page, cursor, type, typeCode, marks, target, sleep, shot });
  } catch (e) {
    failure = e;
    console.error(`\n✗ scene body failed at ${marks.elapsed.toFixed(2)}s: ${e.message}`);
  }

  const video = page.video();
  await context.close(); // video is only written here — there is no way to stop it early

  // saveAs needs the browser alive, so it has to happen between the two closes.
  let trackPath = null;
  if (video) {
    trackPath = path.join(TRACKS, `${trackName}.webm`);
    await video.saveAs(trackPath);
    await video.delete();
  }
  await browser.close();
  const marksPath = await marks.save(TRACKS, trackName);

  console.log(`\n  track  ${trackPath}`);
  console.log(`  marks  ${marksPath}`);
  console.log(`  length ${marks.entries.at(-1)?.at.toFixed(2) ?? '?'}s over ${marks.entries.length} beats`);
  if (shotCount) console.log(`  stills  ${shotCount} in ${path.relative(ROOT, shotDir)}/`);
  if (errors.length) console.log(`  page errors (${errors.length}):\n    ${errors.slice(0, 8).join('\n    ')}`);

  if (failure) process.exitCode = 1;
  return { trackPath, marksPath, marks, errors, failure };
}
