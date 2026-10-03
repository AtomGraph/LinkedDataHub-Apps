// Two things the overview needs that nothing has filmed yet.
//
// C3's second lane: a Turtle file dropped on a document. The file-drop overlay takes
// any file; RDF is imported into the document the drop landed on. What does the page
// show afterwards, and without a reload? Writes into a scratch document it removes.
//
// F4: the sign-in screen, seen anonymously — the Login control in the navigation bar
// and what it opens. Read-only.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { spawn } from 'node:child_process';

const opts = await resolve('/');
const { base, identity, ldh, certFile, certPasswordFile, certPassword } = opts;
const password = certPassword ?? (await fs.readFile(certPasswordFile, 'utf8')).trim();
const run = (args) => new Promise((res) => { const p = spawn(ldh, args); let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', (code) => res({ code, out })); });

const slug = `drop-probe-${Date.now().toString(36)}`;
const { url } = await resetDocument({ ...opts, container: `${base}/`, slug, title: 'Drop probe' });

const ttl = `@prefix schema: <https://schema.org/> .
@prefix dct: <http://purl.org/dc/terms/> .
<#this> a schema:Place ; dct:title "Rockville" ; schema:name "Rockville" ; schema:description "A territory dropped in as Turtle." .
`;

await runScene({
  id: 'probe-drop-signin', target: url, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot }) {
    const responses = [];
    page.on('response', (r) => { if (['PUT', 'POST', 'PATCH'].includes(r.request().method()) && r.url().startsWith(base)) responses.push(`${r.request().method()} ${r.status()} ${r.url().slice(base.length, base.length + 60)}`); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('a.document-history, .action-bar', { timeout: 25_000 });
    await sleep(3000);
    await shot('before');

    const transfer = await page.evaluateHandle(({ name, type, text }) => {
      const t = new DataTransfer();
      t.items.add(new File([text], name, { type }));
      return t;
    }, { name: 'rockville.ttl', type: 'text/turtle', text: ttl });
    const { width, height } = page.viewportSize();
    await cursor.moveTo(width * 0.5, height * 0.55, { duration: 600 });
    await page.dispatchEvent('body', 'dragenter', { dataTransfer: transfer });
    await page.locator('#file-drop').waitFor({ timeout: 5000 });
    await sleep(800);
    console.log('  overlay text:', JSON.stringify(await page.locator('#file-drop').innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 200))));
    await shot('overlay');
    await page.dispatchEvent('#file-drop', 'drop', { dataTransfer: transfer });
    await sleep(9000);
    console.log('  writes:', JSON.stringify(responses));
    console.log('  url now:', page.url());
    console.log('  mode in url:', decodeURIComponent(page.url()).match(/mode=[^&]*/)?.[0] ?? '-');
    const text = await page.locator('.ldh-pane.is-active, main').first().innerText().catch(() => '');
    console.log('  page mentions Rockville:', /Rockville/.test(text), '| dropped-in description:', /dropped in as Turtle/.test(text));
    await shot('after-drop');
    const got = await run(['get', '--accept', 'text/turtle', url, '-c', certFile, '-p', password]);
    console.log('  stored graph has Rockville:', /Rockville/.test(got.out));
  },
});
console.log('  deleted scratch:', (await run(['delete', url, '-c', certFile, '-p', password])).code === 0);

// The sign-in screen, anonymously.
const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await ctx.newPage();
await page.goto(base + '/', { waitUntil: 'load' });
await page.waitForTimeout(5000);
const login = page.locator('button, a').filter({ hasText: /Log in|Login|Sign in/i });
console.log('  login controls:', await login.count(), JSON.stringify(await login.evaluateAll((es) => es.map((e) => e.tagName + ' ' + e.className.slice(0, 40) + ' ' + e.textContent.trim().slice(0, 30)))));
await fs.mkdir('shots/probe-drop-signin', { recursive: true });
await page.screenshot({ path: 'shots/probe-drop-signin/anon-home.png' });
if (await login.count()) {
  await login.first().click();
  await page.waitForTimeout(2500);
  const menu = page.locator('[role=menu]:visible, .ac-dropdown:visible, .ac-modal:visible').first();
  console.log('  after click:', JSON.stringify(await menu.innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 300)).catch(() => 'nothing opened')));
  console.log('  links:', JSON.stringify(await menu.locator('a, button').evaluateAll((es) => es.map((e) => (e.textContent || '').trim().slice(0, 30) + ' → ' + (e.getAttribute('href') || e.className).slice(0, 60))).catch(() => [])));
  await page.screenshot({ path: 'shots/probe-drop-signin/login-open.png' });
}
await browser.close();
