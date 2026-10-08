// Probe for flow H of the overview: what the live assistant does with the film's two
// questions on a scratch Northwind document — whether the read runs at once, how its
// result is drawn, whether the follow-up writes a view and waits for Execute, and how
// long each takes. Prints what it saw; asserts nothing.
//
//   node scenes/probe-assistant.mjs --base … --cert-file … --cert-password-file … --no-video
//   [--ask "…"] [--follow "…"] [--execute]
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const argv = process.argv.slice(2);
const value = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const ASK = value('ask', 'Chart the five customers who ordered the most');
const FOLLOW = value('follow', 'Add them to this page as a view');
const EXECUTE = argv.includes('--execute');

const doc = await resetDocument({ ...opts, container: `${base}/`, slug: 'overview-assistant', title: 'Our best customers' });
const CONTENT = `${doc.url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/linkeddatahub#ContentMode')}`;
console.log(`  scratch: ${doc.url}`);

const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

await runScene({
  id: 'probe-assistant', target: CONTENT, warm: CONTENT, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page }) {
    await zoom2x(page);
    await load(page, CONTENT, '.ldh-pane.is-active .ldh-create-dock .ldh-chat-open', 2000);
    const content = ui(page).locator('.content-body').filter({ has: page.locator('> .ldh-create-dock') }).first();
    const button = content.locator('> .ldh-create-dock .ldh-chat-open');
    console.log(`  ${at()} Assistant button: ${await button.count()}`);
    await button.click();
    const chatUri = await content.locator('> .ldh-chat-ephemeral .ldh-chat').getAttribute('data-chat');
    const chat = () => page.locator(`.ldh-chat[data-chat="${chatUri}"]`);
    const composer = () => chat().locator('> form.ldh-chat-composer textarea');
    const card = () => chat().locator('.ldh-chat-log > .ldh-chat-plan').last();
    console.log(`  ${at()} execute by default: ${await chat().locator('.ldh-chat-run input').isChecked().catch(() => '?')}`);

    const report = async (label) => {
      const c = card();
      const steps = await c.locator('.ldh-chat-step').evaluateAll((els) => els.map((e) => `${e.querySelector('.op')?.textContent?.trim()}:${[...e.classList].filter((k) => k.startsWith('is-')).join(',')}`));
      const wells = await c.locator('.ldh-chat-result-block').evaluateAll((els) => els.map((e) => e.getAttribute('data-mode')?.split('#')[1]));
      console.log(`  ${at()} ${label}`);
      console.log(`    summary: ${(await c.locator('.ldh-chat-plan-meta, .ldh-chat-summary').first().textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200)}`);
      console.log(`    answer: ${(await c.locator('.ldh-chat-answer').textContent().catch(() => '')).trim().slice(0, 300)}`);
      console.log(`    steps: ${steps.join(' ')}`);
      console.log(`    result wells: ${JSON.stringify(wells)}; svg: ${await c.locator('svg').count()}; table rows: ${await c.locator('table tbody tr').count()}`);
      console.log(`    docs written: ${JSON.stringify(await c.locator('.ldh-chat-docs a.iri').evaluateAll((els) => els.map((e) => e.getAttribute('href'))))}`);
      console.log(`    execute button: ${await c.locator('.ldh-chat-execute').isVisible().catch(() => false)}`);
    };

    // the read: expected to run on arrival and end in an answer
    await composer().fill(ASK);
    await composer().press('Enter');
    await card().locator('.ldh-chat-answer:not(:empty), .ldh-chat-execute, .ldh-chat-step.is-failed').first().waitFor({ timeout: 240_000 }).catch(() => {});
    await sleep(4000);
    await report(`ASK: ${ASK}`);
    await page.screenshot({ path: 'shots/probe-assistant-1.png' });

    // the follow-up: expected to write, so to wait for Execute
    await composer().fill(FOLLOW);
    await composer().press('Enter');
    await card().locator('.ldh-chat-execute, .ldh-chat-answer:not(:empty), .ldh-chat-step.is-failed').first().waitFor({ timeout: 240_000 }).catch(() => {});
    await sleep(2000);
    await report(`FOLLOW: ${FOLLOW}`);
    await page.screenshot({ path: 'shots/probe-assistant-2.png' });

    if (EXECUTE && await card().locator('.ldh-chat-execute').isVisible().catch(() => false)) {
      await card().locator('.ldh-chat-execute').click();
      await card().locator('.ldh-chat-answer:not(:empty), .ldh-chat-step.is-failed').first().waitFor({ timeout: 240_000 }).catch(() => {});
      await sleep(8000);
      await report('EXECUTED');
      const blocks = await content.locator('> .ldh-block-row').evaluateAll((els) => els.map((e) => `${e.getAttribute('about')?.split('#')[1]} ${e.querySelector('.ldh-block-head .ttl')?.textContent?.trim() ?? ''}`));
      console.log(`  ${at()} blocks on the page: ${JSON.stringify(blocks)}`);
      await page.screenshot({ path: 'shots/probe-assistant-3.png' });
    }
  },
});
