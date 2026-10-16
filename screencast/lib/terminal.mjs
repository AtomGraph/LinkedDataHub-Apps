// Recording a terminal, the way scenes record a browser.
//
// Everything else in this harness films a page, so the producer is Playwright. A few
// slots are not pages — the Docker setup the get-started guide opens with, the CLI and
// content-negotiation beats of the long cut, the whole right-hand pane of the
// split-screen teaser — and those are a shell. This is their producer.
//
// A tape is to a terminal what a scene is to a browser: it lives in tapes/, it is
// committed, and it runs the real commands. VHS drives a real pty and records it, so
// what the tape types is what the viewer would type.
//
// Two things are owned here rather than in the tape:
//
//   Geometry, because a terminal clip has to cut with a browser clip. Browser clips are
//   1440x810 at 25fps — Playwright records the CSS size, so deviceScaleFactor does not
//   multiply it, and a clip is 1440x810 while a still is 2880 wide. The preamble below
//   is prepended to the tape at run time, so tapes carry no dimensions.
//
//   The readiness check, because the assertion worth making about a setup recording is
//   that the setup worked. The tape ends on the log line the docs quote, with the stack
//   still attached to VHS's shell — so the probe runs WHILE the recording does, rather
//   than after it, when VHS has taken the shell and its containers down with it.
//
// VHS 0.12 has no --var, so variables reach a tape through the environment: the tape
// reads $LDH_* and this passes them on the spawn.

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';

// Matches the browser clips. Framerate is VHS's; the pacer re-encodes afterwards, but
// starting at 25 means no resampling.
const PREAMBLE = [
  'Set Shell "bash"',
  'Set Width 1440',
  'Set Height 810',
  'Set Framerate 25',
  'Set FontSize 22',
  'Set Padding 24',
  // VHS types at one fixed speed, which lib/typing.mjs exists to avoid — real typing
  // varies per character and slows at punctuation. 55ms is that module's code-typing
  // base, so a command reads at the pace a person types one, even without the jitter.
  'Set TypingSpeed 55ms',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a tape and returns the raw recording.
 *
 * @param tape     path to the .tape file
 * @param output   where VHS should write the recording (extension decides the format)
 * @param env      variables the tape reads
 * @param watchUrl polled while the recording runs; answering at all is the readiness
 *                 signal, exactly as CI treats an unauthenticated 403
 */
export async function record(tape, { output, env = {}, watchUrl = null } = {}) {
  await requireVhs();

  // The preamble is prepended into a temporary copy, so the committed tape stays free of
  // geometry and the producer stays the one place it is decided.
  const body = await fs.readFile(tape, 'utf8');
  const staged = path.join(os.tmpdir(), `ldh-${path.basename(tape, '.tape')}-${process.pid}.tape`);
  await fs.writeFile(staged, `${PREAMBLE.join('\n')}\n\n${body}`);
  await fs.mkdir(path.dirname(output), { recursive: true });

  const started = Date.now();
  let cameUp = false;
  let watching = true;

  const watcher = watchUrl
    ? (async () => {
        while (watching) {
          if (await answers(watchUrl)) { cameUp = true; return; }
          await sleep(3000);
        }
      })()
    : Promise.resolve();

  const code = await run('vhs', [staged, '-o', output], { env: { ...process.env, ...env } });
  watching = false;
  await watcher;
  await fs.rm(staged, { force: true });

  return {
    ok: code === 0,
    output,
    cameUp,
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    why: code === 0 ? undefined : `vhs exited ${code}`,
  };
}

// Any HTTP answer counts. A LinkedDataHub that is up but refuses an anonymous caller
// replies 403, which is the readiness gate the CI workflows wait on.
//
// node:https rather than fetch: the instance the tape builds serves the certificate
// bin/server-cert-gen.sh just made, which nothing trusts. fetch() has no per-request
// way to accept it and rejects the connection, so the probe reported every healthy
// instance as one that never answered.
function answers(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { rejectUnauthorized: false, timeout: 5000 }, (res) => {
      res.resume();
      resolve(res.statusCode > 0);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function requireVhs() {
  const code = await run('vhs', ['--version'], { quiet: true }).catch(() => 127);
  if (code !== 0) {
    throw new Error("vhs is not on PATH — a terminal shot needs it: 'brew install vhs'");
  }
}

function run(cmd, args, { env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: quiet ? 'ignore' : 'inherit' });
    child.on('error', reject);
    child.on('close', resolve);
  });
}

/**
 * The environment for a tape that runs curl against the stack, with the stack trusted.
 *
 * A tape's curl carries no -k: the command on camera is the one a viewer would type
 * against a public instance. On a stack whose certificate curl cannot verify — the dev
 * stack's names only localhost, so docs.localhost fails on the name even with the
 * certificate as CA — the recording shell trusts it through a .curlrc of its own
 * instead, the way the browser takes ignore HTTPS errors. Only verification is excused:
 * the request is made here first, exactly as the tape makes it, and a stack that
 * answers with anything but 200 is a failed take before anything is filmed, since
 * `curl -s` would film an empty answer.
 *
 * @param url  the document the tape asks for
 * @param env  the tape's variables
 * @returns    env, plus CURL_HOME when the stack had to be trusted
 */
export async function trustedCurlEnv(url, env = {}) {
  const probe = (extra) => new Promise((resolve) => {
    const p = spawn('curl', ['-s', '-o', '/dev/null', '-m', '20', '-H', 'Accept: text/turtle', '-w', '%{http_code}', url], { env: { ...process.env, ...env, ...extra } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, status: out.trim() }));
  });
  let r = await probe({});
  let trusted = {};
  if (r.code === 60 || r.code === 35) {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ldh-curl-'));
    await fs.writeFile(path.join(home, '.curlrc'), 'insecure\n');
    trusted = { CURL_HOME: home };
    r = await probe(trusted);
  }
  if (r.code !== 0 || r.status !== '200') throw new Error(`${url} answers ${r.status || `curl exit ${r.code}`} to a GET for Turtle; the tape would film nothing`);
  return { ...env, ...trusted };
}
