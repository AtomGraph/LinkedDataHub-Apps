// Not a scene. Dry run of the SHACL flow: before (no Person type), admin creates a property
// shape and a node shape for foaf:Person, clears the ontology, after (Person offered, form
// from the shape, empty save → violation).
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { patchDocument } from '../lib/fixture.mjs';
const opts = await resolve('/');
const { identity, base } = opts;
const ADMIN = base.replace('://', '://admin.');
const identities = identity ? [...identity, { ...identity[0], origin: ADMIN }] : null;
const NS_DOC = `${ADMIN}/ontologies/namespace/`;
const plain = { click: async (l) => l.click() };
const sugg = (page) => page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item').evaluateAll((ls) => ls.map((l) => [l.textContent.replace(/\s+/g, ' ').trim(), l.title]));
const formOf = (page) => page.locator('form:visible').filter({ has: page.locator('.ldh-prop-group') }).last();
const dumpForm = async (page, what) => {
  const groups = await formOf(page).locator('.ldh-prop-group').evaluateAll((gs) => gs.map((g) => ({
    label: (g.querySelector('.pred')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30),
    inputs: [...g.querySelectorAll('input:not([type=hidden]), textarea, select')].map((i) => `${i.tagName.toLowerCase()}.${i.className.split(' ')[0]}#${i.name}=${(i.value ?? '').slice(0, 30)}`),
    violation: g.className.includes('violation'), text: g.className.includes('violation') ? g.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : undefined,
  })));
  console.log(`  ${what}:`, JSON.stringify(groups));
};
const group = (page, re) => formOf(page).locator('.ldh-prop-group').filter({ has: page.locator('.pred', { hasText: re }) }).first();
const typeIn = async (page, re, text) => { const i = group(page, re).locator('input:not([type=hidden]):visible, textarea:visible').first(); await i.click(); await i.fill(''); await i.pressSequentially(text, { delay: 15 }); };
const removeRow = async (page, re) => { const b = group(page, re).locator('button.btn-remove-property').first(); if (await b.count()) await b.click(); };
const save = async (page) => { await formOf(page).locator('button.btn-save').first().click(); await sleep(4000); };
const dockCreate = async (page, label) => {
  await page.locator('.ldh-create-dock button.drop-toggle').first().click(); await sleep(1200);
  await page.locator('.add-constructor:visible').filter({ hasText: new RegExp(`${label}$`) }).first().click(); await sleep(3500);
};
const RESET = `PREFIX sh: <http://www.w3.org/ns/shacl#>
DELETE { ?s ?p ?o } WHERE { ?s a ?t . FILTER(?t IN (sh:NodeShape, sh:PropertyShape)) ?s ?p ?o }`;
const instanceTypeInput = async (page) => { const g = formOf(page).locator('.ldh-prop-group').filter({ has: page.locator('input[name=pu][value$="#type"]') }).first(); const edit = g.locator('button.add-type-combobox').first(); if (await edit.count()) { await edit.click(); await sleep(800); } return g.locator('input:not([type=hidden]):visible').first(); };

const reset = await patchDocument({ ldh: opts.ldh, certFile: opts.certFile, certPassword: opts.certPassword, certPasswordFile: opts.certPasswordFile, url: NS_DOC, update: RESET });
console.log('  reset:', JSON.stringify(reset));
await runScene({
  id: 'probe-shacl-flow', target: base + '/', identity: identities,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    page.on('response', async (r) => { if ([422, 400, 500].includes(r.status())) { try { console.log('  ←', r.status(), r.request().method(), r.url().slice(0, 80), (await r.text()).replace(/\s+/g, ' ').slice(0, 600)); } catch {} } });
    await page.context().addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(ADMIN).hostname, path: '/' }]);

    // ── before ──
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }); await sleep(2000);
    await switchDocumentMode(page, plain, 'read-mode'); await sleep(2500);
    await dockCreate(page, 'Instance');
    console.log('  Instance form html:', (await formOf(page).evaluate((f) => f.outerHTML)).slice(0, 2500));
    const tin = await instanceTypeInput(page);
    console.log('  type input:', await tin.count(), await tin.evaluate((i) => `${i.tagName}.${i.className}#${i.name}`).catch(() => null));
    if (await tin.count()) { await tin.click(); await tin.pressSequentially('Person', { delay: 40 }); await sleep(6000); console.log('  BEFORE type suggestions (Person):', JSON.stringify(await sugg(page))); }

    // ── admin: property shape ──
    await page.goto(NS_DOC, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }); await sleep(2500);
    await dockCreate(page, 'Property shape');
    await dumpForm(page, 'Property shape form (fresh)');
    await typeIn(page, /^Name$/, 'Name');
    await typeIn(page, /^Path$/, 'http://xmlns.com/foaf/0.1/name'); await sleep(1500); await page.keyboard.press('Escape');
    await typeIn(page, /^Min count$/, '1');
    await typeIn(page, /^Datatype$/, 'http://www.w3.org/2001/XMLSchema#string'); await sleep(1500); await page.keyboard.press('Escape');
    await removeRow(page, /^Max count$/);
    await dumpForm(page, 'Property shape form (filled)');
    await save(page);
    console.log('  after PS save: forms', await page.locator('form:visible').filter({ has: page.locator('.ldh-prop-group') }).count(), 'blocks', await page.locator('.ldh-pane.is-active .ldh-block').count());
    if (await page.locator('form:visible').filter({ has: page.locator('.ldh-prop-group') }).count()) await dumpForm(page, 'PS form still open');

    // ── admin: node shape ──
    await dockCreate(page, 'Node shape');
    await typeIn(page, /^Label$/, 'Person shape');
    await typeIn(page, /^Target class$/, 'http://xmlns.com/foaf/0.1/Person'); await sleep(1500); await page.keyboard.press('Escape');
    const pin = group(page, /^Property$/).locator('input:not([type=hidden]):visible').first();
    await pin.click(); await pin.pressSequentially('Name', { delay: 40 }); await sleep(6000);
    const s = await sugg(page); console.log('  Property suggestions (Name):', JSON.stringify(s));
    const hit = page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item').filter({ hasText: /Name/ }).first();
    if (await hit.count()) await hit.click(); else console.log('  !! no property shape suggestion');
    await sleep(800);
    await dumpForm(page, 'Node shape form (filled)');
    await save(page);
    console.log('  after NS save: forms', await page.locator('form:visible').filter({ has: page.locator('.ldh-prop-group') }).count(), 'blocks', await page.locator('.ldh-pane.is-active .ldh-block').count());
    if (await page.locator('form:visible').filter({ has: page.locator('.ldh-prop-group') }).count()) await dumpForm(page, 'NS form still open');
    console.log('  blocks:', JSON.stringify(await page.locator('.ldh-pane.is-active .ldh-block').evaluateAll((bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 120)))));

    // ── clear ──
    const clear = page.locator('.ldh-pane.is-active form[action$="/clear"] button').first();
    console.log('  clear button:', await clear.count());
    if (await clear.count()) { await clear.click(); await page.waitForLoadState('load'); await sleep(3000); console.log('  after clear url:', page.url()); }

    // ── after ──
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 }); await sleep(2000);
    await switchDocumentMode(page, plain, 'read-mode'); await sleep(2500);
    await dockCreate(page, 'Instance');
    const tin2 = await instanceTypeInput(page);
    await tin2.click(); await tin2.pressSequentially('Person', { delay: 40 }); await sleep(6000);
    const s2 = await sugg(page); console.log('  AFTER type suggestions (Person):', JSON.stringify(s2));
    const person = page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item[title="http://xmlns.com/foaf/0.1/Person"]').first();
    if (await person.count()) {
      await person.click(); await sleep(5000);
      await dumpForm(page, 'Person form');
      await save(page);
      await dumpForm(page, 'after empty save');
    } else console.log('  !! Person not offered');
  },
});
