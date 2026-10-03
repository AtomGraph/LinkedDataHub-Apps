// Flow D of the overview — versions: the History dialog on a document written three
// times, each version with the agent who wrote it (D1); two versions compared, the
// diff marked on the document, and an earlier version restored, the page re-reading
// with it (D2).
//
// The document is a scratch item with real properties — a city with a name and a
// description — written through ldh off camera: once on creation, then twice more with
// the description changed, so the diff has a row to mark and the restore something to
// bring back. Versioning on the dataspace is the prerequisite (see FINDINGS #16 for why
// the restore is pressed from the current version, never from inside a comparison).
//
// Writes only to its own scratch document, which it removes at the end.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTop } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity, ldh, certFile, certPasswordFile, certPassword } = opts;
const password = certPassword ?? (await fs.readFile(certPasswordFile, 'utf8')).trim();
const auth = ['-c', certFile, '-p', password];
const run = (args, input = null) => new Promise((res) => {
  const p = spawn(ldh, args);
  if (input !== null) { p.stdin.write(input); p.stdin.end(); }
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => res({ code, out: out.trim(), err: err.trim().split(password).join('••••') }));
});

// A fresh slug every run: the history is keyed by the document's URL, so reusing one
// would show last run's versions on top of this run's three.
const slug = `overview-versions-${Date.now().toString(36)}`;
const root = base.endsWith('/') ? base : base + '/';
const { url } = await resetDocument({ ldh, base, certFile, certPassword, certPasswordFile, container: root, slug, title: 'Rockville' });
const DESCRIPTIONS = [
  'A territory in the Eastern region, covered from the Boston office.',
  'A territory in the Eastern region, covered from the Boston office since 1996.',
  'A territory in the Eastern region, covered from the Providence office since 1996.',
];
const doc = (description) => `@prefix dh: <https://w3id.org/atomgraph/linkeddatahub/document-hierarchy#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix sioc: <http://rdfs.org/sioc/ns#> .
@prefix schema: <https://schema.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<${url}> a dh:Item ; dct:title "Rockville" ; sioc:has_container <${root}> ; foaf:primaryTopic <${url}#this> .
<${url}#this> a schema:City ; schema:name "Rockville" ; dct:title "Rockville" ; schema:description ${JSON.stringify(description)} .
`;
for (const d of DESCRIPTIONS) {
  const put = await run(['put', '-t', 'text/turtle', url, ...auth], doc(d));
  if (put.code !== 0) throw new Error(`fixture: ${put.err.slice(0, 200)}`);
  await sleep(2500); // commits are asynchronous and chained
}
await sleep(4000);
const READ = `${url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;

await runScene({
  id: 'overview-d-versions', target: READ, warm: READ, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await load(page, READ, '.ldh-pane.is-active .ldh-block', 3000);

    // ── D1 · the History dialog ────────────────────────────────────────────────
    const link = () => page.locator('a.document-history').first();
    if (!(await link().isVisible().catch(() => false))) throw new Error('D1: no history link — is versioning enabled for this dataspace?');
    await cursor.moveTo(...(await centre(link())), { duration: 700 });
    await marks.beat('D1-start', 'the document; pointer on its History link', await focus(ui(page).locator('.ldh-block').first()));
    await cursor.click(link());
    const modal = () => page.locator('.ac-modal:visible').last();
    await modal().waitFor({ state: 'visible', timeout: 15_000 });
    await until(page.waitForFunction(() => { const ms = [...document.querySelectorAll('.ac-modal')].filter((m) => m.offsetParent !== null); const m = ms.at(-1); return !!m && m.querySelectorAll('input[type=radio]').length >= 4; }, null, { timeout: 20_000 }), 'the versions in the dialog');
    await sleep(2500);
    const rows = () => modal().locator('tr').filter({ has: page.locator('input[type=radio]') });
    await marks.beat('D1-end', `${await rows().count()} versions, each with its agent`, await focus(modal()));
    await sleep(800);

    // ── D2 · compare, then restore ─────────────────────────────────────────────
    // From is the first version WITH the description (the creation above it is the bare
    // document, against which every row would read as added); To is the latest.
    await marks.beat('D2-start', 'From and To: the first described version against the latest', await focus(modal()));
    await cursor.click(rows().nth(2).locator('input[type=radio]').first()); await sleep(600);
    await cursor.click(rows().first().locator('input[type=radio]').last()); await sleep(600);
    const compare = modal().locator('button').filter({ hasText: /Compare/ }).last();
    await cursor.moveTo(...(await centre(compare)), { duration: 500 });
    await marks.beat('D2-picked', 'pointer on Compare', await focus(modal()));
    await cursor.click(compare);
    await until(page.waitForFunction(() => document.querySelectorAll('.ldh-pane.is-active [class*="changed"], .ldh-pane.is-active [class*="added"], .ldh-pane.is-active [class*="removed"]').length > 0, null, { timeout: 30_000 }), 'the diff marks on the document');
    await easeScrollTop(page, { ms: 1000 }); await sleep(1500);
    const marked = ui(page).locator('[class*="changed"], [class*="added"], [class*="removed"]');
    await marks.beat('D2-diff', `${await marked.count()} rows marked: the description changed`, await focus(ui(page).locator('.ldh-block').first()));
    await sleep(2500);

    // Back to the current version — Restore is only honest from there (FINDINGS #16).
    const current = ui(page).locator('a').filter({ hasText: /current version/i }).first();
    if (!(await current.count())) throw new Error('D2: no link back to the current version');
    await cursor.click(current);
    await until(page.waitForFunction(() => !/version=/.test(location.search) && !!document.querySelector('.ldh-pane.is-active .ldh-block'), null, { timeout: 30_000 }), 'the current version');
    await sleep(2000);
    await marks.beat('D2-current', 'the current version again; pointer to History');
    await cursor.click(link());
    await modal().waitFor({ state: 'visible', timeout: 15_000 });
    await until(page.waitForFunction(() => { const ms = [...document.querySelectorAll('.ac-modal')].filter((m) => m.offsetParent !== null); const m = ms.at(-1); return !!m && m.querySelectorAll('button.btn-restore').length >= 2; }, null, { timeout: 20_000 }), 'the Restore buttons');
    await sleep(1500);
    // The second version: the one with the Boston office, before the move.
    const restore = rows().nth(1).locator('button.btn-restore').first();
    await cursor.moveTo(...(await centre(restore)), { duration: 600 });
    await marks.beat('D2-restore', 'pointer on Restore, on the previous version', await focus(modal()));
    page.once('dialog', (d) => d.accept());
    await cursor.click(restore);
    await until(page.waitForFunction(() => ![...document.querySelectorAll('.ac-modal')].some((m) => m.offsetParent !== null), null, { timeout: 30_000 }), 'the dialog closing after the restore');
    await until(page.waitForFunction((t) => (document.querySelector('.ldh-pane.is-active')?.innerText ?? '').includes(t), DESCRIPTIONS[1], { timeout: 30_000 }), 'the restored description on the page');
    await sleep(2500);
    await marks.beat('D2-end', 'restored: the page re-read with the earlier description', await focus(ui(page).locator('.ldh-block').first()));
    await sleep(800);
    await marks.beat('end');
  },
});
console.log('  deleted scratch:', (await run(['delete', url, ...auth])).code === 0);
