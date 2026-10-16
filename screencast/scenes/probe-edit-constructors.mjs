// Probe for E3c of the overview: what Edit constructors opens from a product's edit form —
// the dialog's heading, its rows and controls — so the narration describes it as it is.
// Prints what it saw and leaves screenshots in shots/; changes nothing.
//
//   node scenes/probe-edit-constructors.mjs --base … --cert-file … --cert-password-file … --no-video
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { editResource } from '../lib/editing.mjs';
import { GEOMETRY_2X, zoom2x, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const READ = `${base}/products/1/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#ReadMode')}`;

await runScene({
  id: 'probe-edit-constructors', target: READ, warm: READ, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor }) {
    await zoom2x(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, READ, '.ldh-pane.is-active .ldh-block', 3000);
    const ed = await editResource(page, cursor, 'Chai');
    console.log(`  edit form: ${ed.ok ? 'open' : ed.why}`);
    const btn = page.locator('button.btn-edit-constructors:visible').first();
    await btn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    console.log(`  Edit constructors visible: ${await btn.isVisible().catch(() => false)}`);
    await page.screenshot({ path: 'shots/probe-edit-constructors-1.png' });
    await cursor.click(btn);
    await sleep(5000);
    const dialog = page.locator('.modal:visible, dialog[open], [role=dialog]:visible').last();
    console.log(`  dialog: ${await dialog.count()}`);
    const text = (await dialog.innerText().catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, 1500);
    console.log(text.split('\n').map((l) => `    | ${l}`).join('\n'));
    await page.screenshot({ path: 'shots/probe-edit-constructors-2.png' });
  },
});
