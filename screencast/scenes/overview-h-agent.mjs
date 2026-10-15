// Flow H of the overview, its second half — an agent over MCP. A terminal take (H5–H6,
// tapes/overview-h-agent.tape): Claude Code registers Web-Algebra with the command the agents
// docs page gives, `/mcp` lists it connected, and the docs page's prompt — a container of new offers,
// a 20% discount on three Beverages products as schema:Offers of them, and a chart of the offer
// prices — is answered in tool calls. Then the browser (H7): the offers container the agent
// wrote, its items, and the chart on its page.
//
// Off camera, before the take: the previous take's offers documents are removed, and the
// Web-Algebra checkout is built to a wheel that the tape's `uv run --with web-algebra` resolves
// to (through UV_FIND_LINKS), so the agent runs the operations as they stand rather than the
// last PyPI release. The terminal runs in the LinkedDataHub deployment's directory, where the
// docs command's ssl/ and secrets/ paths resolve.
//
//   node scenes/overview-h-agent.mjs --base … --cert-file … --cert-password-file …
//        [--deployment ../../linkeddatahub.com] [--web-algebra ../../Web-Algebra] [--browser-only]
//
// The agent's documents are removed after a take only when H7 was filmed; --browser-only films
// H7 again from the documents a failed one left, without another terminal take.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runScene, resolve, geometryFrom, sleep, until, TRACKS, ROOT } from '../lib/harness.mjs';
import { record } from '../lib/terminal.mjs';
import { removeAll } from '../lib/fixture.mjs';
import { select } from '../lib/sparql.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const argv = process.argv.slice(2);
const value = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const DEPLOYMENT = path.resolve(value('deployment', path.join(ROOT, '..', '..', 'linkeddatahub.com')));
const WEB_ALGEBRA = path.resolve(value('web-algebra', path.join(ROOT, '..', '..', 'Web-Algebra')));
const OFFERS = `${base}/offers/`;
const BROWSER_ONLY = argv.includes('--browser-only');

const run = (cmd, args, options = {}) => new Promise((res) => {
  const p = spawn(cmd, args, options); let out = '', err = '';
  p.stdout?.on('data', (d) => (out += d)); p.stderr?.on('data', (d) => (err += d));
  p.on('error', (e) => res({ code: -1, out, err: e.message }));
  p.on('close', (code) => res({ code, out: out.trim(), err: err.trim() }));
});

// ── off camera ─────────────────────────────────────────────────────────────────
const underOffers = async () => (await select(base, `SELECT DISTINCT ?doc WHERE { GRAPH ?doc { ?s ?p ?o } FILTER(STRSTARTS(STR(?doc), ${JSON.stringify(OFFERS)})) }`)).map((r) => r.doc);
if (!BROWSER_ONLY) {
  const previous = (await underOffers()).sort((a, b) => b.length - a.length); // children before the container
  if (previous.length) {
    const gone = await removeAll({ ...opts, urls: previous });
    const failed = gone.filter(([, ok]) => !ok).map(([u]) => u);
    if (failed.length) throw new Error(`reset: could not remove ${failed.join(', ')}`);
  }
  console.log(`  reset: ${previous.length} offers documents removed`);

  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'ldh-overview-h-'));
  const wheels = path.join(scratch, 'wheels');
  const built = await run('uv', ['build', '--wheel', '-o', wheels], { cwd: WEB_ALGEBRA });
  if (built.code !== 0) throw new Error(`could not build Web-Algebra: ${built.err.slice(-400)}`);
  const settings = path.join(scratch, 'settings.json');
  await fs.writeFile(settings, JSON.stringify({
    permissions: { allow: ['mcp__web-algebra'], deny: ['Bash', 'Write', 'Edit'] },
    enabledPlugins: { 'figma@claude-plugins-official': false },
  }));
  console.log(`  built: ${(await fs.readdir(wheels)).join(', ')}`);

  // ── H5–H6 · the terminal ───────────────────────────────────────────────────────
  // The take's Claude Code is a session of its own, not a child of whatever runs this scene: an
  // inherited CLAUDE* marker puts a warning in its footer, as an available update puts a
  // notice there
  for (const k of Object.keys(process.env)) if (k.startsWith('CLAUDE')) delete process.env[k];
  process.env.DISABLE_AUTOUPDATER = '1';
  const tape = await record(path.join(ROOT, 'tapes', 'overview-h-agent.tape'), {
    output: path.join(TRACKS, 'overview-h-agent-terminal.mp4'),
    env: { TAKE_DIR: DEPLOYMENT, TAKE_WHEELS: wheels, TAKE_SETTINGS: settings, TAKE_EXCLUDE_NEWER: '2026-10-05T00:00:00Z' },
  });
  await fs.rm(scratch, { recursive: true, force: true });
  if (!tape.ok) throw new Error(`H5: ${tape.why}`);
  console.log(`  terminal: ${tape.seconds}s → ${tape.output}`);
  const written = await underOffers();
  // the offers may be items of their own or share one: a container and one item at least
  if (written.length < 2) throw new Error(`H6: the agent wrote ${written.length} documents under offers/, not a container and its offers`);
  console.log(`  written: ${written.map((u) => u.replace(base, '')).join(' ')}`);
}

// ── H7 · the browser ──────────────────────────────────────────────────────────
// The agent puts the chart where it sees fit: on the container, or on the item that holds the
// offers. The take opens on the container either way and, for an item's chart, follows its link.
const charted = await select(base, `PREFIX ldh: <https://w3id.org/atomgraph/linkeddatahub#>
PREFIX dct: <http://purl.org/dc/terms/>
SELECT ?doc ?title WHERE { GRAPH ?doc { ?chart a ldh:ResultSetChart . ?doc dct:title ?title } FILTER(STRSTARTS(STR(?doc), ${JSON.stringify(OFFERS)})) } LIMIT 1`);
if (!charted.length) throw new Error('H7: no chart under offers/');
const { doc: chartDoc, title: chartDocTitle } = charted[0];
console.log(`  chart on: ${chartDoc.replace(base, '')}`);
const CONTENT = `${OFFERS}?mode=${encodeURIComponent('https://w3id.org/atomgraph/linkeddatahub#ContentMode')}`;
const shot = await runScene({
  id: 'overview-h-agent', target: CONTENT, warm: CONTENT, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, CONTENT, '.ldh-pane.is-active .ldh-block', 3000);
    const content = () => ui(page).locator('.content-body').filter({ has: page.locator('> .ldh-create-dock') }).first();
    const blocks = () => content().locator('> .ldh-block-row');
    await until(blocks().first().locator('a').first().waitFor({ state: 'visible', timeout: 30_000 }), 'the offers container\'s children');
    await sleep(1500);
    await marks.beat('H7-start', 'the offers container the agent wrote', await focus(blocks().first()));
    await sleep(3000);
    if (chartDoc !== OFFERS) {
      const link = blocks().first().locator('a').filter({ hasText: chartDocTitle }).first();
      await cursor.click(link);
      await page.waitForURL((u) => u.href.startsWith(chartDoc), { timeout: 30_000 });
    }
    const chart = blocks().filter({ has: page.locator('svg') }).last();
    await until(chart.locator('svg').first().waitFor({ state: 'visible', timeout: 60_000 }), 'the agent\'s chart');
    await sleep(1500);
    await easeScrollTo(chart, { ms: 1600, margin: 200 }); await sleep(3000);
    const title = (await chart.locator('.ldh-block-head .ttl').first().textContent().catch(() => '')).trim();
    await marks.beat('H7-chart', `the chart: ${title}`, await focus(chart));
    await sleep(1500);
    await cursor.moveTo(1440, 1500, { duration: 600 });
    await marks.beat('H7-end', 'editable by hand, like any document');
    await sleep(800);
    await marks.beat('end');
  },
});

// The offers documents go once H7 is filmed, so the other takes' document tree shows the demo's
// own documents only; a failed H7 leaves them for --browser-only.
if (shot.failure) process.exit(1);
const left = (await underOffers()).sort((a, b) => b.length - a.length);
await removeAll({ ...opts, urls: left });
console.log(`  removed: ${left.length} offers documents`);
