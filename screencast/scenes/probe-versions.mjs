// Versioning, end to end, for the overview's flow D: a scratch document is written
// three times off camera through ldh (create, then two PUTs with different titles),
// so the History dialog has versions to show; then the dialog is opened, two versions
// are compared, and the oldest is restored. Logs what each step found and stills each
// state, so the shot can be scripted against what the dialog really renders.
//
// Writes only to its own scratch document, which it removes at the end.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';

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

const slug = 'versioning-probe';
const { url } = await resetDocument({ ...opts, container: `${base}/`, slug, title: 'Versioning probe, first title' });
console.log('  created', url);

// Two more writes, each a full PUT of the document with a different title, so the
// history holds three versions that differ in one visible property.
for (const title of ['Versioning probe, second title', 'Versioning probe, third title']) {
  const got = await run(['get', '--accept', 'text/turtle', url, ...auth]);
  if (got.code !== 0) throw new Error(`get failed: ${got.err}`);
  const ttl = got.out.replace(/"Versioning probe, [a-z]+ title"/, JSON.stringify(title));
  const put = await run(['put', '-t', 'text/turtle', url, ...auth], ttl);
  console.log(`  put "${title}" →`, put.code === 0 ? 'ok' : put.err.slice(0, 200));
  await sleep(2500); // commits are asynchronous and chained; give each one room
}
await sleep(4000);

await runScene({
  id: 'probe-versions', target: url, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot }) {
    await page.goto(url, { waitUntil: 'load' });
    // A bare scratch item renders no view block; the history link in the action bar is
    // the thing this probe is about, so that is what it waits for.
    await page.waitForSelector('a.document-history', { timeout: 25_000 });
    await sleep(3000);
    await shot('page');
    console.log('  page blocks:', JSON.stringify(await page.locator('.ldh-pane.is-active [class*="ldh-"]').evaluateAll((es) => [...new Set(es.map((e) => e.className.split(' ')[0]))].slice(0, 12))));

    const link = page.locator('a.document-history').first();
    console.log('  history link:', await link.count(), await link.evaluate((e) => e.outerHTML.slice(0, 200)).catch(() => 'none'));
    await cursor.click(link);
    const modal = page.locator('.ac-modal:visible').last();
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(4000);
    await shot('history');

    const rows = modal.locator('tr').filter({ has: page.locator('input[type=radio]') });
    console.log('  version rows:', await rows.count());
    console.log('  row texts:', JSON.stringify(await rows.allInnerTexts()));
    console.log('  buttons:', JSON.stringify(await modal.locator('button, a.ac-btn').allInnerTexts()));
    console.log('  per-row controls:', JSON.stringify(await rows.first().locator('button, a, input').evaluateAll((es) => es.map((e) => e.tagName + ' ' + (e.className || '') + ' ' + (e.textContent || e.value || '').trim().slice(0, 30)))));

    // Compare: oldest as From, newest as To.
    const n = await rows.count();
    if (n >= 2) {
      await cursor.click(rows.last().locator('input[type=radio]').first()); await sleep(500);
      await cursor.click(rows.first().locator('input[type=radio]').last()); await sleep(500);
      await shot('picked');
      const compare = modal.locator('button').filter({ hasText: /Compare/ }).last();
      console.log('  compare visible:', await compare.isVisible().catch(() => false));
      await cursor.click(compare);
      await sleep(6000);
      await page.evaluate(() => window.scrollTo(0, 0)); await sleep(800);
      const marked = await page.locator('[class*="added"], [class*="removed"], [class*="changed"]').count();
      console.log('  diff marks on the page:', marked);
      console.log('  diff classes:', JSON.stringify(await page.locator('[class*="added"], [class*="removed"], [class*="changed"]').evaluateAll((es) => [...new Set(es.map((e) => e.className))].slice(0, 8))));
      await shot('diff');
    }

    // Restore: reopen the dialog, find the restore control on a version that is not current.
    await cursor.click(page.locator('a.document-history').first());
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(3000);
    const restore = modal.locator('button, a').filter({ hasText: /Restore/ });
    console.log('  restore controls:', await restore.count(), JSON.stringify(await restore.evaluateAll((es) => es.map((e) => e.outerHTML.slice(0, 160)))));
    if (await restore.count()) {
      page.once('dialog', (d) => { console.log('  confirm dialog:', d.message()); d.accept(); });
      await cursor.click(restore.last());
      await sleep(8000);
      console.log('  modal still open:', await page.locator('.ac-modal:visible').count());
      const title = await page.locator('.ldh-pane.is-active h1, .ldh-pane.is-active .ldh-block h2').first().innerText().catch(() => '?');
      console.log('  title after restore:', JSON.stringify(title));
      const got = await run(['get', '--accept', 'text/turtle', url, ...auth]);
      console.log('  stored title after restore:', (got.out.match(/"Versioning probe, [a-z]+ title"/) || ['?'])[0]);
      await shot('restored');
    }
  },
});

const gone = await run(['delete', url, ...auth]);
console.log('  deleted scratch:', gone.code === 0);
