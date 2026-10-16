// F4: the ways in, signed out — the Login menu's Google and ORCID, then Sign up, which
// issues a WebID certificate. Run with --anonymous on a stack configured with the Google
// and ORCID clients (the menu lists only what is configured). The two halves are cut in
// the narration's order: the sign-up form first, then the menu.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { chrome } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const root = base.endsWith('/') ? base : base + '/';

await runScene({
  id: 'overview-f-login', target: root, warm: root, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, marks }) {
    await zoom2x(page);
    await load(page, root, '.ldh-pane.is-active .ldh-block', 3000);
    const bar = chrome(page);
    const login = bar.locator('button.drop-toggle').filter({ hasText: /Login/ }).first();
    const google = bar.locator('a.ac-menu-item').filter({ hasText: 'Login with Google' }).first();
    const orcid = bar.locator('a.ac-menu-item').filter({ hasText: 'Login with ORCID' }).first();
    const signUp = bar.locator('a').filter({ hasText: /^\s*Sign up\s*$/ }).first();

    await cursor.moveTo(2200, 700, { duration: 500 });
    await marks.beat('F4-menu-start', 'signed out: Login and Sign up in the bar', await focus(login, signUp));
    await cursor.click(login);
    await google.waitFor({ state: 'visible', timeout: 5000 });
    await marks.beat('F4-menu-open', 'Login with Google, Login with ORCID', await focus(login, google, orcid));
    await cursor.moveOver(google, { duration: 500 });
    await sleep(1200);
    await cursor.moveOver(orcid, { duration: 400 });
    await sleep(1200);
    await marks.beat('F4-menu-end', 'both providers shown');
    await page.keyboard.press('Escape');
    await sleep(300);

    // the sign-up form lives on the administration host, which the first-time cookie does not cover
    const href = await signUp.getAttribute('href');
    const { hostname } = new URL(href);
    await page.context().addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: hostname, path: '/' }]);
    await cursor.click(signUp);
    await page.waitForURL((u) => u.hostname === hostname, { timeout: 30_000 });
    await page.waitForSelector('form input[type=email]', { timeout: 40_000 });
    await sleep(1500);
    await marks.beat('F4-webid-start', 'Sign up: the WebID profile and its certificate', await focus(page.locator('form').first()));
    await cursor.moveTo(1400, 900, { duration: 900 });
    await sleep(3500);
    await marks.beat('F4-webid-end', 'the WebID sign-up form');
    await sleep(500);
    await marks.beat('end');
  },
});
