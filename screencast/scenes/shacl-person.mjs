// The model builds the interface, SHACL edition: a dataspace that cannot create a Person
// (S0); in the admin dataspace a property shape — foaf:name, string, at least one — and a
// node shape targeting foaf:Person are created in the namespace ontology, with the ontology's
// own Clear pressed afterwards (A1–A3); back in the end-user dataspace Person is now a type
// on offer and its form carries the Name field the shape asked for (B1); saved without a
// name the server answers 422 with a sh:ValidationResult and the field is marked (B2); named,
// the record is saved and shown (B3).
//
// Both halves are filmed in one tab: the admin origin is the end-user origin with an
// `admin.` prefix, so the owner identity is bound to both (as overview-g-packages does).
//
// The class and property lookups on the shape forms query the admin store, which holds no
// vocabulary, so foaf:Person, foaf:name and xsd:string are typed as URIs — a vocabulary term
// the ontology's author knows, like the URI the user guide has them type for a constructor.
// Everything else is picked by label on camera: the property shape by its sh:name, Person by
// its class label.
//
// Off camera first: the shapes and any Person made by an earlier take are removed and the
// ontology cache cleared, so the "before" is real.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { patchDocument } from '../lib/fixture.mjs';
import { ui } from '../lib/dom.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity, ldh, certFile, certPasswordFile, certPassword } = opts;
const password = certPassword ?? (await fs.readFile(certPasswordFile, 'utf8')).trim();
const ADMIN = base.replace('://', '://admin.');
const NS_DOC = `${ADMIN}/ontologies/namespace/`;
const NS = `${base}/ns#`;
const ROOT = `${base}/`;
const PERSON = 'Ada Lovelace';
const FOAF = 'http://xmlns.com/foaf/0.1/';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

// ── reset ────────────────────────────────────────────────────────────────────
const fx = { ldh, certFile, certPassword, certPasswordFile };
const r1 = await patchDocument({ ...fx, url: NS_DOC, update: `PREFIX sh: <http://www.w3.org/ns/shacl#>
DELETE { ?s ?p ?o } WHERE { ?s a ?t . FILTER(?t IN (sh:NodeShape, sh:PropertyShape)) ?s ?p ?o }` });
if (!r1.ok) throw new Error(`reset: could not remove the shapes: ${r1.out}`);
const r2 = await patchDocument({ ...fx, url: ROOT, update: `PREFIX foaf: <${FOAF}>
DELETE { ?s ?p ?o } WHERE { ?s a foaf:Person ; ?p ?o }` });
if (!r2.ok) throw new Error(`reset: could not remove earlier people: ${r2.out}`);
const run = (args) => new Promise((res) => { const p = spawn(ldh, args); let out = '', err = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d)); p.on('close', (code) => res({ code, out: out.trim(), err: err.trim().split(password).join('••••') })); });
const cleared = await run(['admin', 'clear', 'ontology', ROOT, '-c', certFile, '-p', password, '--ontology', NS]);
if (cleared.code !== 0) throw new Error(`reset: could not clear the ontology: ${cleared.err.slice(0, 200)}`);
console.log('  reset: shapes and people removed, ontology cleared');

const identities = identity ? [...identity, { ...identity[0], origin: ADMIN }] : null;

await runScene({
  id: 'shacl-person', target: ROOT, warm: ROOT, identity: identities,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.context().addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(ADMIN).hostname, path: '/' }]);

    const form = () => ui(page).locator('form.ldh-edit-form:visible').last();
    const group = (re) => form().locator('.ldh-prop-group').filter({ has: page.locator('.pred', { hasText: re }) }).first();
    const sugg = () => page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item');
    const typeInto = async (re, text, { uri = false } = {}) => {
      const input = group(re).locator('input:not([type=hidden]):visible, textarea:visible').first();
      await input.scrollIntoViewIfNeeded();
      await cursor.click(input);
      await type(input, text, uri ? { base: 18, spread: 6 } : { base: 30, spread: 12 });
      // a typed URI opens the lookup panel on nothing; it is closed, the URI stays the value
      if (uri) { await sleep(900); await page.keyboard.press('Escape'); await sleep(300); }
    };
    const removeRow = async (re) => {
      const btn = group(re).locator('button.btn-remove-property').first();
      await btn.scrollIntoViewIfNeeded(); await cursor.click(btn); await sleep(500);
    };
    const saveBtn = () => form().locator('button.btn-save').first();
    const dockCreate = async (label) => {
      const toggle = page.locator('.ldh-create-dock button.drop-toggle').first();
      await until(toggle.waitFor({ state: 'visible', timeout: 20_000 }), 'the Create dock');
      await cursor.moveTo(...(await centre(toggle)), { duration: 600 });
      await cursor.click(toggle); await sleep(1100);
      const item = page.locator('.add-constructor:visible').filter({ hasText: new RegExp(`${label}$`) }).first();
      await until(item.waitFor({ state: 'visible', timeout: 10_000 }), `${label} in the Create menu`);
      await cursor.click(item);
      await until(form().waitFor({ state: 'visible', timeout: 15_000 }), `the ${label} form`);
      await sleep(1500);
    };
    // the Instance form's Type is a committed chip; its edit opens the class lookup
    const openTypeLookup = async () => {
      const g = form().locator('.ldh-prop-group').filter({ has: page.locator('input[name=pu][value$="#type"]') }).first();
      const edit = g.locator('button.add-type-combobox').first();
      await cursor.click(edit); await sleep(800);
      const input = g.locator('input:not([type=hidden]):visible').first();
      await cursor.click(input);
      await type(input, 'Person', { base: 60, spread: 20 });
      return input;
    };
    const blocks = () => ui(page).locator('.ldh-block');

    // ── S0 · before: no Person to create ───────────────────────────────────────
    // The root opens in Content mode on its children view; the Create dock offers the model's
    // classes in Properties, so the switch is on camera (the Properties page of an empty root
    // has no blocks, only the dock).
    const toProperties = async () => {
      await switchDocumentMode(page, cursor, 'read-mode');
      await until(page.locator('.ldh-create-dock button.drop-toggle').first().waitFor({ state: 'visible', timeout: 20_000 }), 'the Create dock in Properties');
      await sleep(1200);
    };
    await load(page, ROOT, '.ldh-pane.is-active .ldh-block', 3000);
    await marks.beat('S0-start', 'the dataspace, empty but for its root', await focus(blocks().first()));
    await sleep(1500);
    await toProperties();
    await marks.beat('S0-properties', 'Properties; Create at the foot of the page');
    await dockCreate('Instance');
    await marks.beat('S0-form', 'a new Instance; its Type, a lookup over the model\'s classes', await focus(form()));
    await openTypeLookup();
    await sleep(5000);
    const before = (await sugg().allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    if (before.some((t) => /^Person\b/.test(t))) throw new Error(`S0: Person is already on offer: ${JSON.stringify(before)}`);
    await marks.beat('S0-end', `"Person" finds no class: the model has nothing to build a Person from (offered: ${JSON.stringify(before)})`, await focus(form()));
    await sleep(1500);
    await page.keyboard.press('Escape');

    // ── A1 · admin: the property shape ─────────────────────────────────────────
    await marks.beat('A1-start', 'to the admin dataspace: the namespace ontology');
    await load(page, NS_DOC, '.ldh-pane.is-active .ldh-block', 3000);
    await marks.beat('A1-doc', 'the Namespace ontology, one block', await focus(blocks().first()));
    await sleep(1500);
    await dockCreate('Property shape');
    await marks.beat('A1-form', 'the Property shape form: name, path, counts, datatype', await focus(form()));
    await typeInto(/^Name$/, 'Name');
    await typeInto(/^Path$/, `${FOAF}name`, { uri: true });
    await typeInto(/^Min count$/, '1');
    await typeInto(/^Datatype$/, XSD_STRING, { uri: true });
    await removeRow(/^Max count$/);
    await marks.beat('A1-filled', 'foaf:name, a string, at least one; max count dropped', await focus(form()));
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 500 });
    await cursor.click(saveBtn());
    await until(page.waitForFunction(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].some((b) => /Property shape/.test(b.textContent) && !b.querySelector('form')), null, { timeout: 20_000 }), 'the property shape as a block');
    await sleep(2000);
    const psBlock = blocks().filter({ hasText: 'Property shape' }).first();
    await easeScrollTo(psBlock, { ms: 900, block: 'center' }); await sleep(600);
    await marks.beat('A1-end', 'saved: the property shape, a resource of the ontology', await focus(psBlock));
    await sleep(1200);

    // ── A2 · admin: the node shape ─────────────────────────────────────────────
    await dockCreate('Node shape');
    await marks.beat('A2-form', 'the Node shape form: label, property, target class', await focus(form()));
    await typeInto(/^Label$/, 'Person shape');
    await typeInto(/^Target class$/, `${FOAF}Person`, { uri: true });
    const pin = group(/^Property$/).locator('input:not([type=hidden]):visible').first();
    await pin.scrollIntoViewIfNeeded();
    await cursor.click(pin);
    await type(pin, 'Name', { base: 60, spread: 20 });
    const hit = sugg().filter({ hasText: /Name/ }).filter({ hasText: /Property shape/ }).first();
    await until(hit.waitFor({ state: 'visible', timeout: 15_000 }), 'the property shape in the lookup');
    await sleep(1200);
    await marks.beat('A2-lookup', 'Property: the shape just made, found by its name', await focus(form()));
    await cursor.click(hit); await sleep(800);
    await marks.beat('A2-filled', 'targets foaf:Person, carries the Name property shape', await focus(form()));
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 500 });
    await cursor.click(saveBtn());
    await until(page.waitForFunction(() => [...document.querySelectorAll('.ldh-pane.is-active .ldh-block')].some((b) => /Node shape/.test(b.textContent) && !b.querySelector('form')), null, { timeout: 20_000 }), 'the node shape as a block');
    await sleep(2000);
    const nsBlock = blocks().filter({ hasText: 'Node shape' }).first();
    await easeScrollTo(nsBlock, { ms: 900, block: 'center' }); await sleep(600);
    await marks.beat('A2-end', 'saved: the node shape', await focus(nsBlock));
    await sleep(1200);

    // ── A3 · the ontology's Clear: the cached closure is rebuilt ───────────────
    const clear = ui(page).locator('form[action$="/clear"] button').first();
    await until(clear.waitFor({ state: 'visible', timeout: 10_000 }), 'the ontology\'s Clear button');
    await easeScrollTo(clear, { ms: 900, block: 'center' }); await sleep(500);
    await cursor.moveTo(...(await centre(clear)), { duration: 600 });
    await marks.beat('A3-start', 'pointer on Clear: the dataspace re-reads its model', await focus(blocks().first()));
    await cursor.click(clear);
    await page.waitForLoadState('load').catch(() => {});
    await until(page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }), 'the ontology, reloaded');
    await sleep(2000);
    await marks.beat('A3-end', 'cleared and reloaded');

    // ── B1 · after: Person on offer, its form from the shape ───────────────────
    await marks.beat('B1-start', 'back to the dataspace');
    await load(page, ROOT, '.ldh-pane.is-active .ldh-block', 3000);
    await toProperties();
    await dockCreate('Instance');
    await openTypeLookup();
    const person = sugg().filter({ has: page.locator('[title="http://xmlns.com/foaf/0.1/Person"]') }).first();
    const personAlt = page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item[title="http://xmlns.com/foaf/0.1/Person"]').first();
    const found = await Promise.race([
      person.waitFor({ state: 'visible', timeout: 15_000 }).then(() => person, () => null),
      personAlt.waitFor({ state: 'visible', timeout: 15_000 }).then(() => personAlt, () => null),
    ]);
    if (!found) throw new Error(`B1: Person not offered after the shape (offered: ${JSON.stringify(await sugg().allInnerTexts())})`);
    await sleep(1200);
    await marks.beat('B1-offered', '"Person" now finds a class: the shape made it one the dataspace can build', await focus(form()));
    await cursor.click(found);
    const nameField = () => group(/^Name$/);
    const failure = form().locator('.ldh-failure');
    const outcome = await Promise.race([
      nameField().waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'field', () => null),
      failure.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'failure', () => null),
    ]);
    if (outcome === 'failure') throw new Error(`B1: the Person form failed to render — ${(await failure.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
    if (outcome !== 'field') throw new Error(`B1: no Name field on the Person form (groups: ${JSON.stringify(await form().locator('.pred').allInnerTexts())})`);
    await sleep(2000);
    await marks.beat('B1-end', 'the Person form: a Name field, from the shape — no constructor was written', await focus(form()));
    await sleep(1500);

    // ── B2 · saved without a name: 422, the field marked ───────────────────────
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 600 });
    await marks.beat('B2-save', 'Name empty; pointer on Save', await focus(form()));
    await cursor.click(saveBtn());
    const violated = () => form().locator('.ldh-prop-group.is-violation');
    await until(violated().first().waitFor({ state: 'visible', timeout: 20_000 }), 'a violation on a field');
    await sleep(1500);
    const which = (await violated().allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 60));
    if (!which.some((w) => /name/i.test(w))) throw new Error(`B2: the violation landed on ${JSON.stringify(which)}, not on Name`);
    await marks.beat('B2-end', `refused by the shape, 422: ${JSON.stringify(which)}`, await focus(form()));
    await sleep(1500);

    // ── B3 · named, saved, shown ───────────────────────────────────────────────
    await typeInto(/^Name$/, PERSON);
    await saveBtn().scrollIntoViewIfNeeded();
    await cursor.moveTo(...(await centre(saveBtn())), { duration: 500 });
    await marks.beat('B3-filled', 'the name in; pointer on Save', await focus(form()));
    await cursor.click(saveBtn());
    await until(page.waitForFunction((t) => (document.querySelector('.ldh-pane.is-active')?.innerText ?? '').includes(t) && !document.querySelector('.ldh-pane.is-active form.ldh-edit-form'), PERSON, { timeout: 30_000 }), 'the person on the page');
    await sleep(1500);
    const personBlock = blocks().filter({ hasText: PERSON }).first();
    await easeScrollTo(personBlock, { ms: 900, block: 'center' }); await sleep(800);
    await marks.beat('B3-end', `saved: ${PERSON}, a Person, on the page`, await focus(personBlock));
    await sleep(1500);
    await marks.beat('end');
  },
});
