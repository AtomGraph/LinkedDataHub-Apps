// Not a scene. The admin Node shape form's target class lookup: which endpoint, which query, what comes back.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { identity, base } = opts;
const ADMIN = base.replace('://', '://admin.');
const identities = identity ? [...identity, { ...identity[0], origin: ADMIN }] : null;
const NS_DOC = `${ADMIN}/ontologies/namespace/`;
const sugg = (page) => page.locator('.ac-cb-panel[role=listbox]:visible li.ac-cb-item').evaluateAll((ls) => ls.map((l) => [l.textContent.replace(/\s+/g, ' ').trim(), l.title]));
await runScene({
  id: 'probe-shacl-adm', target: NS_DOC, identity: identities,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page }) {
    page.on('request', (r) => { const q = decodeURIComponent(r.url()) + (r.postData() ?? ''); if (/SELECT|DESCRIBE/.test(q) && /label|Label/.test(q)) console.log('  → ', r.method(), r.url().slice(0, 90), '|', q.replace(/\s+/g, ' ').slice(q.indexOf('SELECT'), q.indexOf('SELECT') + 400)); });
    page.on('response', async (r) => { if (/sparql|\/ns\?/.test(r.url()) && r.request().method() !== 'OPTIONS') { try { const t = await r.text(); if (/label/i.test(decodeURIComponent(r.url()))) console.log('  ← ', r.status(), t.replace(/\s+/g, ' ').slice(0, 300)); } catch {} } });
    await page.context().addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(ADMIN).hostname, path: '/' }]);
    await page.goto(NS_DOC, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block', { timeout: 30_000 });
    await sleep(2500);
    await page.locator('.ldh-create-dock button.drop-toggle').first().click(); await sleep(1200);
    await page.locator('.add-constructor:visible').filter({ hasText: /Node shape$/ }).first().click(); await sleep(3500);
    const g = page.locator('form:visible .ldh-prop-group').filter({ hasText: /target class/i }).first();
    const input = g.locator('input.resource-combobox:visible').first();
    console.log('  input attrs:', await input.evaluate((i) => JSON.stringify({ name: i.name, cls: i.className, ds: { ...i.dataset }, list: i.getAttribute('list') })));
    console.log('  group html:', (await g.evaluate((e) => e.outerHTML)).slice(0, 1500));
    await input.click(); await input.pressSequentially('Person', { delay: 60 }); await sleep(8000);
    console.log('  targetClass suggestions (Person):', JSON.stringify(await sugg(page)));
    await input.fill(''); await input.pressSequentially('Namespace', { delay: 60 }); await sleep(8000);
    console.log('  targetClass suggestions (Namespace):', JSON.stringify(await sugg(page)));
    // a typed URI?
    await input.fill(''); await input.pressSequentially('http://xmlns.com/foaf/0.1/Person', { delay: 20 }); await sleep(5000);
    console.log('  after typing URI: suggestions', JSON.stringify(await sugg(page)), 'hidden ou:', await g.locator('input[name=ou]').evaluateAll((is) => is.map((i) => i.value)));
  },
});
