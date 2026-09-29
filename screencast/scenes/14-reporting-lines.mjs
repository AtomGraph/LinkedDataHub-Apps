// "Reporting lines."
//
// Opens on the team grid. Fuller's page lists the five people who report to him — the
// derived "Direct reports" view. King reports to Buchanan; the line is one link on
// King's record, edited on his own page and re-pointed by name. Fuller's list, read
// again: six.
//
//   make scene SCENE=14-reporting-lines BASE=… CERT_FILE=… CERT_PASSWORD_FILE=… LDH_BIN=…

import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { deleteByTitle, patchDocument } from '../lib/fixture.mjs';
import { select as sparql } from '../lib/sparql.mjs';
import { crumbGo, searchGo, listGo } from '../lib/nav.mjs';
import { addProse, switchDocumentMode } from '../lib/blocks.mjs';
import { createItem } from '../lib/constructors.mjs';
import { editResource, repoint, saveForm } from '../lib/editing.mjs';
import { scrollThrough } from '../lib/frame.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const OPENS_ON = `${base}/employees/`;
const TITLE = 'Reporting lines';
const WHO = 'King', FROM = 'Buchanan', TO = 'Fuller';

const rep = async (fam) => (await sparql(base, `PREFIX schema: <https://schema.org/> SELECT ?e WHERE { GRAPH ?g { ?e a schema:Person ; schema:familyName "${fam}" } }`))[0]?.e;
const [who, from, to] = await Promise.all([rep(WHO), rep(FROM), rep(TO)]);
if (!who || !from || !to) throw new Error('rep not found');
// Last take moved King; he goes back under Buchanan first.
const reset = await patchDocument({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile,
  url: who.replace(/#.*$/, ''),
  update: `PREFIX schema: <https://schema.org/>\nDELETE { <${who}> schema:sponsor <${to}> }\nINSERT { <${who}> schema:sponsor <${from}> }\nWHERE {}` });
console.log(`reset: ${WHO} reports to ${FROM}: ${reset.ok ? 'ok' : reset.out}`);
const gone = await deleteByTitle({ ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, title: TITLE });
console.log(`cleanup: removed ${gone.removed.length} earlier "${TITLE}"`);
let url = null;

await runScene({
  id: '14-reporting-lines',
  target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),

  async body({ page, cursor, type, marks }) {
    const reports = () => page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Direct reports' }).first();
    const count = async () => (await reports().locator('.ldh-view-toolbar .count b').first().textContent({ timeout: 4000 }).catch(() => '?')).trim();

    await page.goto(OPENS_ON, { waitUntil: 'load' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.ldh-block-body img[src*="/uploads/"]')].filter((i) => i.complete && i.naturalWidth > 0).length >= 9,
      { timeout: 30_000 },
    ).catch(() => {});
    await marks.beat('team', 'nine people, with their photographs');
    await sleep(2200);

    const tile = page.locator('.ldh-pane.is-active .ldh-grid-block a.card').filter({ has: page.locator('.ti', { hasText: new RegExp(`^\\s*${TO}\\s*$`) }) }).first();
    if (!(await tile.count())) throw new Error(`no ${TO} tile`);
    await cursor.click(tile);
    await page.waitForLoadState('load').catch(() => {});
    await reports().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    await sleep(2200);
    const before = await count();
    await marks.beat('manager', `${TO} — ${before} direct reports, listed on his page`);
    await sleep(2600);

    // ── say why, before the work ────────────────────────────────────────────
    await crumbGo(page, cursor, 'Root');
    await sleep(800);
    const made = await createItem(page, cursor, TITLE);
    await marks.beat('create', made.ok ? `a new page, ${TITLE}` : made.why);
    if (!made.ok) throw new Error(made.why);
    url = made.url;
    await sleep(700);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p1 = await addProse(page, cursor, type,
      `${TO} has ${before} people reporting to him; ${FROM}, one of them, has three of his own. ${WHO} moves from ${FROM} to ${TO}. The reporting line is one link on ${WHO}'s record, and both managers' pages list who points at them.`);
    await marks.beat('question', p1.ok ? 'the change, written down' : p1.why);
    await sleep(3200);

    // ── the link, re-pointed on the record ──────────────────────────────────
    const k = await searchGo(page, cursor, WHO, { type: 'Person' });
    if (!k.ok) throw new Error(k.why);
    const ed = await editResource(page, cursor, /Family name/);
    await marks.beat('edit', ed.ok ? `${WHO} — reports to ${FROM}; open for editing` : ed.why);
    if (!ed.ok) throw new Error(ed.why);
    await sleep(900);
    const rp = await repoint(page, cursor, type, ed.form, 'Reports to', TO, { kind: 'Person' });
    if (!rp.ok) throw new Error(rp.why);
    const sv = await saveForm(page, cursor, ed.form);
    await marks.beat('repoint', sv.ok ? `reports to ${TO} — picked by name, saved` : sv.why);
    if (!sv.ok) throw new Error(sv.why);
    await sleep(1400);

    // ── the same list, read again ───────────────────────────────────────────
    // Fuller's page, by name — the record's own link is not reliably rendered
    // right after the save (the pre-edit block lingers), and search is one gesture.
    const f = await searchGo(page, cursor, TO, { type: 'Person' });
    if (!f.ok) throw new Error(f.why);
    await reports().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    await sleep(2500);
    await marks.beat('manager-again', `${TO} — the same list, read again: ${await count()} direct reports`);
    await sleep(2600);

    const up = await crumbGo(page, cursor, 'Root');
    if (!up.ok) throw new Error(up.why);
    await sleep(600);
    const home = await listGo(page, cursor, TITLE);
    if (!home.ok) throw new Error(home.why);
    await switchDocumentMode(page, cursor, 'content-mode');
    await sleep(600);
    const p2 = await addProse(page, cursor, type,
      `${WHO} now reports to ${TO}: ${before} direct reports when this page was opened, ${Number(before) + 1} now, and ${FROM} has two. One link changed; two pages read differently.`);
    await marks.beat('note', p2.ok ? undefined : p2.why);
    await sleep(700);
    const scrolled = await scrollThrough(page, { duration: 4200 });
    await marks.beat('page', `read back over ${Math.round(scrolled)}px`);
    await sleep(550);
    await marks.beat('end');
    await sleep(400);
  },
});
