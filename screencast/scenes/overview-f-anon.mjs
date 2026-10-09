// F3's proof: the dataspace opened with no certificate at all, after make-public — the
// private window of the script. Run with --anonymous, after overview-f-cli.mjs.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const root = base.endsWith('/') ? base : base + '/';

await runScene({
  id: 'overview-f-anon', target: root, warm: root, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await load(page, root, '.ldh-pane.is-active .ldh-block', 3000);
    await cursor.moveTo(2600, 1500, { duration: 500 });
    const signedOut = await page.locator('button, a').filter({ hasText: /Sign up/ }).count();
    await marks.beat('F3-anon-start', `the dataspace, anonymously (Sign up in the bar: ${signedOut})`, await focus(ui(page).locator('.ldh-block').first()));
    await sleep(4000);
    await marks.beat('F3-anon-end', 'readable by anyone');
    await sleep(500);
    await marks.beat('end');
  },
});
