// Flow F of the overview — the CLI: a folder of Turtle pushed into an emptied dataspace
// (F1, a terminal take), the dataspace rendered in the browser straight after (F2), and
// the dataspace made public from the command line (F3, a terminal take); the anonymous
// visit that proves it is overview-f-anon.mjs, a take of its own without a certificate.
//
// The dataspace is the documentation site on the dev stack, and the folder is the docs
// app in this repository — the push that docs/install.sh does. Off camera first: every
// document in the dataspace is deleted, so what the push brings alive was not there, and
// the public-read authorization is removed, so make-public has something to do. Both are
// restored by the takes themselves; the dataspace ends as it began.
//
// Two terminal takes are recorded in the middle of the browser take, so the browser
// shows the dataspace as the commands left it.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runScene, resolve, geometryFrom, sleep, until, TRACKS, ROOT } from '../lib/harness.mjs';
import { record } from '../lib/terminal.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, load } from '../lib/supercut.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity, ldh, certFile, certPasswordFile, certPassword } = opts;
const password = certPassword ?? (await fs.readFile(certPasswordFile, 'utf8')).trim();
const root = base.endsWith('/') ? base : base + '/';
const ADMIN = base.replace('://', '://admin.');
const APP_DIR = path.resolve(ROOT, '..', 'docs');
const run = (args) => new Promise((res) => { const p = spawn(ldh, args); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); p.on('close', (code) => res({ code, out: out.trim(), err: err.trim().split(password).join('••••') })); });
const auth = ['-c', certFile, '-p', password];

// ── off camera: empty the dataspace, withdraw public access ──────────────────────
// The endpoint answers the owner even once the dataspace is no longer public, which it is
// not between the reset and make-public; the rig's anonymous select would be refused.
const selectAs = (endpoint, query) => new Promise((res, rej) => {
  const p = spawn('curl', ['-sk', '-m', '60', `${endpoint}/sparql`, '-H', 'Accept: text/csv', '--data-urlencode', `query=${query}`, '--cert-type', 'P12', '--cert', `${certFile}:${password}`]);
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', (code) => code ? rej(new Error(`curl exited ${code}`)) : res(out.trim().split('\n').slice(1).map((l) => l.trim().replace(/^"|"$/g, ''))));
});
const docs = (await selectAs(base, 'SELECT DISTINCT ?g { GRAPH ?g { ?s ?p ?o } }')).filter((g) => g.startsWith(root) && g !== root && !g.startsWith(`${root}uploads/`));
let gone = 0;
for (const g of docs) if ((await run(['delete', g, ...auth])).code === 0) gone++;
console.log(`  reset: ${gone}/${docs.length} documents deleted`);
// `ldh admin make-public` PATCHes the authorization the platform seeds for every
// dataspace at acl/authorizations/public/ — Read for anyone, but with no accessTo until
// the command adds the document classes. The reset puts that document back to its seeded
// state (platform/datasets/admin.trig), so the command on camera has its work to do.
const PUBLIC_AUTH = `${ADMIN}/acl/authorizations/public/`;
const seeded = `@prefix dh: <https://w3id.org/atomgraph/linkeddatahub/document-hierarchy#> .
@prefix sioc: <http://rdfs.org/sioc/ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<${PUBLIC_AUTH}> a dh:Item ; sioc:has_container <${ADMIN}/acl/authorizations/> ; dct:title "Public access" ; foaf:primaryTopic <${PUBLIC_AUTH}#this> .
<${PUBLIC_AUTH}#this> a acl:Authorization ; rdfs:label "Public access" ; rdfs:comment "Allows non-authenticated access" ; acl:mode acl:Read ; acl:agentClass foaf:Agent, acl:AuthenticatedAgent .
`;
const runIn = (args, input) => new Promise((res) => { const p = spawn(ldh, args); p.stdin.write(input); p.stdin.end(); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); p.on('close', (code) => res({ code, out: out.trim(), err: err.trim().split(password).join('••••') })); });
const reseeded = await runIn(['put', '-t', 'text/turtle', PUBLIC_AUTH, ...auth], seeded);
console.log(`  reset: ${PUBLIC_AUTH.replace(ADMIN, '')} back to its seeded state: ${reseeded.code === 0 ? 'ok' : reseeded.err.slice(0, 160)}`);
await sleep(2000);
// Node's fetch refuses the stack's self-signed certificate; curl -k is the honest probe.
// Past the cache, which would answer 200 from a page cached before the authorization went.
const status = (url) => new Promise((res) => { const p = spawn('curl', ['-sk', '-o', '/dev/null', '-m', '20', '-H', 'Cache-Control: no-cache', '-w', '%{http_code}', `${url}?nc=${Date.now()}`]); let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', () => res(out.trim())); });
const anon = await status(root);
console.log(`  reset: anonymous GET ${root} → ${anon}`);
if (anon !== '403') throw new Error(`reset: the dataspace is still readable anonymously (${anon}); nothing for make-public to do`);

// F3 creates an Editors group and an authorization for it: last take's go first, so the commands
// on camera create rather than collide. The group's member is the owner, whose WebID is the root
// document's creator
const ADMIN_ROOT = `${ADMIN}/`;
for (const d of ['acl/groups/editors/', 'acl/authorizations/editors-user-guide/']) await run(['delete', `${ADMIN_ROOT}${d}`, ...auth]);
const WEBID = ((await run(['get', '--accept', 'text/turtle', root, ...auth])).out.match(/<(https:\/\/[^>]+\/acl\/agents\/[^>]+#this)>/) ?? [])[1];
if (!WEBID) throw new Error('reset: no owner WebID on the root document');
console.log(`  reset: Editors group and authorization removed; member ${WEBID}`);

const env = { LDH_BASE: root, LDH_ADMIN_BASE: ADMIN_ROOT, WEBID, LDH_CERT_FILE: path.resolve(certFile), LDH_CERT_PASSWORD: password, LDH_CLIP_DIR: APP_DIR };

await runScene({
  id: 'overview-f-cli', target: root, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);

    // ── F1 · the push, in the terminal ─────────────────────────────────────────
    await marks.beat('F1-terminal-start', 'the push take begins');
    const push = await record(path.join(ROOT, 'tapes', 'overview-f-push.tape'), { output: path.join(TRACKS, 'overview-f-push-terminal.mp4'), env });
    if (!push.ok) throw new Error(`F1: ${push.why}`);
    await marks.beat('F1-terminal-end', `the push take: ${push.seconds}s`);
    const after = (await selectAs(base, 'SELECT (COUNT(DISTINCT ?g) AS ?n) { GRAPH ?g { ?s ?p ?o } }').catch(() => ['?']))[0];
    console.log(`  after the push: ${after} graphs`);

    // ── F2 · the dataspace, live ───────────────────────────────────────────────
    await load(page, root, '.ldh-pane.is-active .ldh-block', 3000);
    await cursor.moveTo(2600, 1500, { duration: 500 });
    await marks.beat('F2-start', 'the pushed dataspace: its home page');
    await scrollThrough(page, { duration: 5000, settle: 800 });
    await marks.beat('F2-end', 'scrolled through the home page', await focus(ui(page).locator('.ldh-block').first()));
    await sleep(800);

    // ── F3 · make-public, in the terminal ──────────────────────────────────────
    await marks.beat('F3-terminal-start', 'the make-public take begins');
    const pub = await record(path.join(ROOT, 'tapes', 'overview-f-public.tape'), { output: path.join(TRACKS, 'overview-f-public-terminal.mp4'), env });
    if (!pub.ok) throw new Error(`F3: ${pub.why}`);
    await marks.beat('F3-terminal-end', `the make-public take: ${pub.seconds}s`);
    await sleep(2000);
    const anonAfter = await status(root);
    console.log(`  after make-public: anonymous GET ${root} → ${anonAfter}`);
    if (anonAfter !== '200') throw new Error(`F3: the dataspace is not public after make-public (${anonAfter})`);

    for (const d of ['acl/groups/editors/', 'acl/authorizations/editors-user-guide/']) {
      const got = await run(['get', '--head', '--accept', 'text/turtle', `${ADMIN_ROOT}${d}`, ...auth]);
      if (got.code !== 0) throw new Error(`F3: ${d} was not created`);
    }

    // ── F3b · the same document as Turtle ──────────────────────────────────────
    await marks.beat('F3b-terminal-start', 'the ldh get take begins');
    const neg = await record(path.join(ROOT, 'tapes', 'overview-f-get.tape'), { output: path.join(TRACKS, 'overview-f-get-terminal.mp4'), env });
    if (!neg.ok) throw new Error(`F3b: ${neg.why}`);
    await marks.beat('F3b-terminal-end', `the ldh get take: ${neg.seconds}s`);
    await marks.beat('end');
  },
});
