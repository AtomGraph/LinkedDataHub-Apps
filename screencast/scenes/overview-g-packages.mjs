// Flow G of the overview — packages, one triple: a concept in the thesaurus rendered as a
// plain resource, no tree (G1); the package added from the command line (G2, a terminal
// take this scene records in the middle of itself, so the add on camera is the add the
// browser then shows); the same concept with the concept tree in the content column and
// its broader and narrower views (G3); the package's ontology, a document of the
// dataspace's own under admin/ontologies/, opened for editing (G4).
//
// Off camera first: `ldh packages remove`, so the "before" is real. The take leaves the
// package installed, which is the dataspace's normal state.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runScene, resolve, geometryFrom, sleep, until, TRACKS } from '../lib/harness.mjs';
import { record } from '../lib/terminal.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity, ldh, certFile, certPasswordFile, certPassword } = opts;
const password = certPassword ?? (await fs.readFile(certPasswordFile, 'utf8')).trim();
const PACKAGE = 'https://packages.linkeddatahub.com/editor/taxonomy/#this';
const CONCEPT = `${base}/concepts/concept7367/`; // Denmark
const ADMIN = base.replace('://', '://admin.');
const ONTOLOGY_DOC = `${ADMIN}/ontologies/editor-taxonomy/`;

const run = (args) => new Promise((res) => { const p = spawn(ldh, args); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); p.on('close', (code) => res({ code, out: out.trim(), err: err.trim().split(password).join('••••') })); });
const auth = [`${base}/`, '-c', certFile, '-p', password];
const removed = await run(['packages', 'remove', ...auth, '--package', PACKAGE]);
if (removed.code !== 0) throw new Error(`reset: could not remove the package: ${removed.err.slice(0, 200)}`);
console.log('  reset: package removed');
await sleep(3000);
const READ = `${CONCEPT}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;

// G4 is on the admin origin, which needs the owner's certificate too: the identity the
// harness resolves is bound to the end-user origin, so the admin origin gets a copy.
const identities = identity ? [...identity, { ...identity[0], origin: ADMIN }] : null;

await runScene({
  id: 'overview-g-packages', target: READ, warm: READ, identity: identities,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    const aside = () => ui(page).locator('.ldh-content-aside').first();

    // ── G1 · before: the concept, no tree ──────────────────────────────────────
    await load(page, READ, '.ldh-pane.is-active .ldh-block', 3000);
    if (await aside().count()) throw new Error('G1: the concept tree is on the page although the package was removed');
    await cursor.moveTo(2600, 1500, { duration: 600 });
    await marks.beat('G1-start', 'the concept as a plain resource: labels, broader, no tree');
    await sleep(4000);
    await marks.beat('G1-end', 'still the plain resource');

    // ── G2 · the terminal: list, add, list ─────────────────────────────────────
    // Recorded here, between the browser's before and after, so the add the viewer sees
    // typed is the add that changes the page. The browser video runs on meanwhile; the
    // cut drops that stretch.
    await marks.beat('G2-terminal-start', 'the terminal take begins');
    const tape = await record(path.resolve(TRACKS, '..', 'tapes', 'overview-g-packages.tape'), {
      output: path.join(TRACKS, 'overview-g-packages-terminal.mp4'),
      env: { LDH_BASE: `${base}/`, LDH_CERT_FILE: path.resolve(certFile), LDH_CERT_PASSWORD: password },
    });
    if (!tape.ok) throw new Error(`G2: ${tape.why}`);
    await marks.beat('G2-terminal-end', `the terminal take: ${tape.seconds}s, ${tape.output}`);
    const listed = await run(['packages', 'list', ...auth]);
    if (!/installed\s+\S*editor\/taxonomy/.test(listed.out)) throw new Error(`G2: the package is not installed after the tape: ${listed.out.slice(0, 200)}`);

    // ── G3 · after: the same concept, with the tree ────────────────────────────
    await marks.beat('G3-start', 'the same concept, reloaded');
    await page.reload({ waitUntil: 'load' });
    await until(aside().waitFor({ state: 'visible', timeout: 60_000 }), 'the concept tree in the content column');
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }), 'the concept, rendered');
    await sleep(3000);
    await marks.beat('G3-tree', 'the concept tree, opened down to the concept', await focus(aside()));
    const views = ui(page).locator('.ldh-block').filter({ has: page.locator('.ldh-view-toolbar') });
    const names = (await views.locator('.ldh-block-head').allTextContents().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 30));
    if (await views.count()) { await easeScrollTo(views.first(), { ms: 1600, margin: 260 }); await sleep(1500); }
    await marks.beat('G3-end', `the package's views: ${JSON.stringify(names)}`, await focus(views.first()));
    await sleep(1000);

    // ── G4 · the ontology, a document of the dataspace's own ───────────────────
    // The first-time dialog is dismissed by a cookie the harness seeds for the end-user
    // host; the admin host is another host, so it gets the same cookie here.
    await page.context().addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(ADMIN).hostname, path: '/' }]);
    await marks.beat('G4-start', 'to the admin dataspace: the ontology the package brought');
    await load(page, ONTOLOGY_DOC, '.ldh-pane.is-active .ldh-block', 3000);
    await sleep(1500);
    const first = ui(page).locator('.ldh-block').first();
    await marks.beat('G4-doc', `the ontology document: ${page.url().replace(base, '')}`, await focus(first));
    // The edit pencil on a resource description appears under acl:Write: here it is.
    const pencil = first.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).first();
    if (await pencil.count()) {
      await first.hover(); await sleep(600);
      await cursor.moveTo(...(await centre(pencil)), { duration: 700 });
      await cursor.click(pencil);
      await until(page.locator('form:visible').first().waitFor({ state: 'visible', timeout: 15_000 }), 'the ontology\'s edit form');
      await sleep(2500);
      await marks.beat('G4-end', 'the ontology open for editing, like any resource of the dataspace', await focus(page.locator('form:visible').first()));
      await page.keyboard.press('Escape');
    } else {
      await marks.beat('G4-end', 'the ontology document (no edit control found)', await focus(first));
    }
    await sleep(800);
    await marks.beat('end');
  },
});
