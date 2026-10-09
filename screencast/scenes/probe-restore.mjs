// Restore on its own, from the current document rather than from inside a comparison:
// the versions probe got a 412 when Restore was pressed while the page was showing a
// historical version, so this one loads the document fresh, opens History and restores
// the previous version straight away. A new slug gives it a history of exactly three
// versions. Writes only to its own scratch document, which it removes at the end.
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

const slug = `restore-probe-${Date.now().toString(36)}`;
const { url } = await resetDocument({ ...opts, container: `${base}/`, slug, title: 'Restore probe, first title' });
for (const title of ['Restore probe, second title', 'Restore probe, third title']) {
  const got = await run(['get', '--accept', 'text/turtle', url, ...auth]);
  const put = await run(['put', '-t', 'text/turtle', url, ...auth], got.out.replace(/"Restore probe, [a-z]+ title"/, JSON.stringify(title)));
  console.log(`  put "${title}" →`, put.code === 0 ? 'ok' : put.err.slice(0, 200));
  await sleep(2500);
}
await sleep(4000);

await runScene({
  id: 'probe-restore', target: url, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, cursor, shot }) {
    const responses = [];
    page.on('response', (r) => { if (['PUT', 'POST', 'PATCH'].includes(r.request().method())) responses.push(`${r.request().method()} ${r.status()} ${r.url().slice(0, 90)} if-match=${r.request().headers()['if-match'] ?? '-'}`); });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('a.document-history', { timeout: 25_000 });
    await sleep(3000);
    console.log('  title shown:', JSON.stringify(await page.locator('.ldh-bc, .action-bar').first().innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 80))));

    await cursor.click(page.locator('a.document-history').first());
    const modal = page.locator('.ac-modal:visible').last();
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(3500);
    const rows = modal.locator('tr').filter({ has: page.locator('input[type=radio]') });
    console.log('  version rows:', await rows.count());
    await shot('history');

    // Restore the version before the current one (second row).
    const restore = rows.nth(1).locator('button.btn-restore');
    console.log('  restore value:', await restore.getAttribute('value'));
    page.once('dialog', (d) => { console.log('  confirm:', d.message()); d.accept(); });
    await cursor.click(restore);
    await sleep(8000);
    console.log('  writes:', JSON.stringify(responses));
    console.log('  modal still open:', await page.locator('.ac-modal:visible').count());
    console.log('  alert in modal:', JSON.stringify(await page.locator('.ac-modal:visible [class*="alert"], .ac-modal:visible [role=alert]').allInnerTexts().catch(() => [])));
    await shot('after-restore');
    const got = await run(['get', '--accept', 'text/turtle', url, ...auth]);
    console.log('  stored title now:', (got.out.match(/"Restore probe, [a-z]+ title"/) || ['?'])[0]);
    console.log('  page title now:', JSON.stringify(await page.locator('.ldh-bc, .action-bar').first().innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 80))));
    await sleep(1000);
  },
});
console.log('  deleted scratch:', (await run(['delete', url, ...auth])).code === 0);
