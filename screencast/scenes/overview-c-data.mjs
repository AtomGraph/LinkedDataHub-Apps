// Flow C of the overview — bringing data in: a remote RDF document copied into the
// dataspace with Actions ▸ Save as (C1); the CSV import form filled from the resources
// the demo ships, the uploaded CSV and the CONSTRUCT that maps it — and not saved,
// because saving would import the products a second time (C2); a photograph dropped on
// a document and uploaded, then a Turtle file dropped on another and imported into it
// (C3).
//
// Writes only into this run's scratch documents, which are reset off camera.
import fs from 'node:fs/promises';
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { resetDocument, removeAll } from '../lib/fixture.mjs';
import { createFromDock } from '../lib/constructors.mjs';
import { pickByLabel, switchDocumentMode } from '../lib/blocks.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const root = base.endsWith('/') ? base : base + '/';
const creds = { ldh: opts.ldh, base, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile };
const fork = await resetDocument({ ...creds, container: root, slug: 'overview-fork', title: 'A concept from UNESCO' });
const photo = await resetDocument({ ...creds, container: root, slug: 'overview-photo', title: 'Dana Whitfield' });
const turtle = await resetDocument({ ...creds, container: root, slug: 'overview-turtle', title: 'A dropped territory' });
const REMOTE = 'https://unesco-thesaurus.demo.linkeddatahub.com/concepts/concept3683/';
const read = (url) => `${url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;

// A file as a DataTransfer the page built itself, so the drag events carry a real File.
async function transferOf(page, { name, mime, bytes }) {
  const b64 = Buffer.from(bytes).toString('base64');
  return page.evaluateHandle(({ name, mime, b64 }) => {
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const t = new DataTransfer();
    t.items.add(new File([arr], name, { type: mime }));
    return t;
  }, { name, mime, b64 });
}

async function drop(page, cursor, marks, id, transfer, note) {
  const { width: vw, height: vh } = page.viewportSize();
  await cursor.moveTo(vw * 0.5, vh * 0.55, { duration: 900 });
  await marks.beat(`${id}-file`, `${note} in hand, over the document`);
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: transfer });
  await page.locator('#file-drop').waitFor({ timeout: 10_000 });
  await cursor.moveTo(vw * 0.56, vh * 0.47, { duration: 2600 });
  await marks.beat(`${id}-drag`, `${note} over the drop overlay`);
  await page.dispatchEvent('#file-drop', 'drop', { dataTransfer: transfer });
}

await runScene({
  id: 'overview-c-data', target: read(fork.url), warm: read(fork.url), identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);

    // ── C1 · a remote document, copied in ──────────────────────────────────────
    await load(page, read(fork.url), '.ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 2500);
    await marks.beat('C1-start', 'an empty document; pointer to Actions');
    await cursor.click(ui(page).locator('button.drop-toggle').filter({ hasText: 'Actions' }).first());
    await sleep(900);
    const saveAs = ui(page).locator('button.btn-save-as').first();
    if (!(await saveAs.isVisible().catch(() => false))) throw new Error('C1: no Save as in the Actions menu');
    await marks.beat('C1-menu', 'the Actions menu, Save as in it');
    await cursor.click(saveAs);
    const modal = page.locator('.ac-modal:visible').last();
    await modal.waitFor({ state: 'visible', timeout: 12000 });
    await sleep(1500);
    await marks.beat('C1-form', 'Source and Graph', await focus(modal));
    const source = modal.locator('.ldh-prop-group').filter({ hasText: 'Source' }).first().locator('input[type=text]:visible').first();
    await cursor.click(source);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await sleep(300);
    await type(source, REMOTE, { base: 18, spread: 6 });
    await sleep(1200);
    await marks.beat('C1-source', 'the remote document as Source', await focus(modal));
    await cursor.click(modal.locator('button').filter({ hasText: /Save/ }).last());
    await page.waitForTimeout(9000);
    await page.goto(read(fork.url), { waitUntil: 'load' });
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }), 'the forked document');
    await sleep(3000);
    const text = await page.locator('.ldh-pane.is-active').first().innerText().catch(() => '');
    if (!/beverage|boisson|concept|skos/i.test(text)) throw new Error('C1: the local document does not describe the remote concept');
    await marks.beat('C1-end', 'the copy: the concept, described locally', await focus(ui(page).locator('.ldh-block').first()));
    await sleep(800);

    // ── C2 · the CSV import form ───────────────────────────────────────────────
    await load(page, `${base}/products/`, '.ldh-pane.is-active .ldh-block', 2500);
    await switchDocumentMode(page, cursor, 'read-mode');
    await sleep(1200);
    await marks.beat('C2-start', 'the products container; pointer to Create');
    const made = await createFromDock(page, cursor, 'CSV import');
    if (!made.ok) throw new Error(`C2: ${made.why}`);
    await sleep(1800);
    const form = page.locator('form:visible').filter({ hasText: 'Delimiter' }).last();
    const group = (label) => form.locator('.ldh-prop-group').filter({ hasText: label }).first();
    await marks.beat('C2-form', 'the CSV import form', await focus(form));
    await type(group('Delimiter').locator('input[type=text]:visible').first(), ',');
    await sleep(600);
    const filePick = await pickByLabel(page, cursor, type, group('File').locator('input[type=text]:visible').first(), 'Products', { kind: 'File' });
    if (!filePick.ok) throw new Error(filePick.why ?? 'C2: the CSV file was not offered');
    await sleep(900);
    await marks.beat('C2-file', 'the uploaded CSV picked as File', await focus(form));
    const queryPick = await pickByLabel(page, cursor, type, group('Query').locator('input[type=text]:visible').first(), 'Products', { kind: 'CONSTRUCT' });
    if (!queryPick.ok) throw new Error(queryPick.why ?? 'C2: the mapping query was not offered');
    await sleep(900);
    await marks.beat('C2-query', 'the CONSTRUCT that maps a row picked as Query', await focus(form));
    await type(group('Title').locator('input[type=text]:visible').first(), 'Products import');
    await sleep(2500);
    await marks.beat('C2-end', 'the form, ready to run (not saved: it would import the products twice)', await focus(form));
    await page.keyboard.press('Escape');
    await sleep(1200);

    // ── C3 · a file dropped: a photo uploaded, then Turtle imported ────────────
    await load(page, read(photo.url), '.ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 2500);
    await marks.beat('C3-start', 'a person\'s document, no picture yet');
    const portrait = await transferOf(page, { name: 'dana.jpg', mime: 'image/jpeg', bytes: await fs.readFile(new URL('../fixtures/dana.jpg', import.meta.url)) });
    await drop(page, cursor, marks, 'C3-photo', portrait, 'the photograph');
    await until(page.waitForURL(/ReadMode/, { timeout: 30_000 }), 'the document reloading after the upload');
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 20_000 }), 'the document, rendered after the upload');
    await sleep(2500);
    const fileBlock = ui(page).locator('.ldh-block').filter({ hasText: 'dana.jpg' }).first();
    if (!(await fileBlock.count())) throw new Error('C3: the drop did not upload dana.jpg');
    await marks.beat('C3-uploaded', 'dropped: uploaded into the document', await focus(fileBlock));
    await sleep(1200);

    await load(page, read(turtle.url), '.ldh-pane.is-active .ldh-block, .ldh-pane.is-active button', 2500);
    await marks.beat('C3-turtle-start', 'an empty document for a Turtle file');
    const ttl = `@prefix schema: <https://schema.org/> .\n@prefix dct: <http://purl.org/dc/terms/> .\n<#this> a schema:City ; dct:title "Rockville" ; schema:name "Rockville" ; schema:description "A territory dropped in as Turtle." .\n`;
    const rdf = await transferOf(page, { name: 'rockville.ttl', mime: 'text/turtle', bytes: Buffer.from(ttl) });
    await drop(page, cursor, marks, 'C3-turtle', rdf, 'the Turtle file');
    await until(page.waitForFunction(() => /Rockville/.test(document.querySelector('.ldh-pane.is-active')?.innerText ?? ''), null, { timeout: 30_000 }), 'the dropped data on the page');
    await sleep(2500);
    await marks.beat('C3-end', 'dropped: the Turtle imported into the document, rendered', await focus(ui(page).locator('.ldh-block').filter({ hasText: 'Rockville' }).first()));
    await sleep(800);
    await marks.beat('end');
  },
});

// The three scratch documents go once the take is in the can (see overview-b-author).
console.log('  scratch removed:', JSON.stringify(await removeAll({ ...creds, urls: [fork.url, photo.url, turtle.url] })));
