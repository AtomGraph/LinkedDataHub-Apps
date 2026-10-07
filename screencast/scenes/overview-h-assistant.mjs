// Flow H of the overview, its first half — the assistant, on a scratch Northwind document in
// Content mode: the create bar's Assistant button starts a chat block, a question is typed and,
// since its plan only reads, runs at once (H1); the answer in words and the rows as a bar chart,
// the trace unfolded (H2); a follow-up that writes waits for Execute with its operations listed,
// and once executed the chart is a block of the page (H3); the page reloaded, the conversation
// still there as a block of the document (H4).
//
// A live model answers, so the plan and the answer's wording differ from take to take: the beats
// assert the card's states - ran, answered, drawn, waiting, written - and never its text. The
// scratch document is reset off camera. The waits for the model (10-30 s for each plan) are cut:
// H1-asked and H3-asked mark where each begins, H1-running and H3-plan where it ends.
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { resetDocument } from '../lib/fixture.mjs';
import { ui } from '../lib/dom.mjs';
import { GEOMETRY_2X, zoom2x, focus, centre, load, easeScrollTo } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const QUESTION = 'Chart the five customers who ordered the most';
const FOLLOW_UP = 'Add the chart to this page';
const doc = await resetDocument({ ...opts, container: `${base}/`, slug: 'overview-assistant', title: 'Our best customers' });
console.log(`  reset: ${doc.url}`);
const CONTENT = `${doc.url}?mode=${encodeURIComponent('https://w3id.org/atomgraph/linkeddatahub#ContentMode')}`;
const MODEL = 240_000;

await runScene({
  id: 'overview-h-assistant', target: CONTENT, warm: CONTENT, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, cursor, type, marks }) {
    await zoom2x(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, CONTENT, '.ldh-pane.is-active .ldh-create-dock .ldh-chat-open', 3000);

    const content = ui(page).locator('.content-body').filter({ has: page.locator('> .ldh-create-dock') }).first();
    const assistant = content.locator('> .ldh-create-dock .ldh-chat-open');
    let chatUri = null;
    const chat = () => page.locator(`.ldh-chat[data-chat="${chatUri}"]`);
    const composer = () => chat().locator('> form.ldh-chat-composer textarea');
    const card = () => chat().locator('.ldh-chat-log > .ldh-chat-plan').last();
    // the beat after Enter is where the cut leaves for the model's wait
    const ask = async (text, beat) => {
      await cursor.moveTo(...(await centre(composer())), { duration: 600 });
      await type(composer(), text);
      await sleep(400);
      await page.keyboard.press('Enter');
      await sleep(1200);
      await marks.beat(beat, `asked: ${text}`, await focus(chat()));
    };

    // ── H1 · ask: a read runs at once ──────────────────────────────────────────
    await cursor.moveTo(...(await centre(assistant)), { duration: 700 });
    await marks.beat('H1-start', 'an empty page; pointer on the create bar\'s Assistant', await focus(content));
    await cursor.click(assistant);
    await until(content.locator('> .ldh-chat-ephemeral .ldh-chat').waitFor({ state: 'visible', timeout: 15_000 }), 'the new chat block');
    chatUri = await content.locator('> .ldh-chat-ephemeral .ldh-chat').getAttribute('data-chat');
    await sleep(600);
    await ask(QUESTION, 'H1-asked');
    await until(card().locator('.ldh-chat-step').first().waitFor({ state: 'visible', timeout: MODEL }), 'the plan\'s steps');
    // the card grows as the steps arrive and the page follows the composer, which takes the
    // question off the top; bring the card's head back
    await card().evaluate((el) => el.closest('.ldh-chat').querySelector('.ldh-chat-turn')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    await sleep(500);
    await marks.beat('H1-running', 'the plan arrived and runs: its steps report', await focus(card()));
    await until(card().locator('.ldh-chat-answer').filter({ hasText: /\S/ }).waitFor({ timeout: MODEL }), 'the answer');
    if (await card().locator('.ldh-chat-step.is-failed').count()) throw new Error('H1: a step failed');
    const chart = card().locator('.ldh-chat-result-block[data-mode$="#ChartMode"] svg').first();
    await until(chart.waitFor({ state: 'visible', timeout: 30_000 }), 'the answer\'s chart');
    await sleep(1200);
    await marks.beat('H1-end', 'answered', await focus(card()));

    // ── H2 · the answer in words, the chart, the trace ─────────────────────────
    const answer = (await card().locator('.ldh-chat-answer').textContent()).trim();
    await easeScrollTo(card(), { ms: 1200, margin: 200 }); await sleep(500);
    await marks.beat('H2-start', `the answer: ${answer.slice(0, 120)}`, await focus(card().locator('.ldh-chat-answer')));
    await sleep(2500);
    await easeScrollTo(chart, { ms: 1200, block: 'center' }); await sleep(2500);
    await marks.beat('H2-chart', 'the rows drawn as a bar chart', await focus(card().locator('.ldh-chat-result-block').first()));
    const trace = card().locator('details.ldh-chat-trace > summary');
    await easeScrollTo(trace, { ms: 1000, block: 'center' }); await sleep(400);
    await cursor.moveTo(...(await centre(trace)), { duration: 600 });
    await cursor.click(trace);
    await sleep(2500);
    await marks.beat('H2-end', `the trace: ${await card().locator('.ldh-chat-step').count()} steps`, await focus(card().locator('details.ldh-chat-trace')));
    await cursor.click(trace); // folded again, so the card is short when the follow-up lands
    await sleep(600);

    // ── H3 · a write waits for Execute; the chart becomes a block ──────────────
    await easeScrollTo(composer(), { ms: 1200, block: 'center' }); await sleep(400);
    await marks.beat('H3-start', 'the follow-up');
    await ask(FOLLOW_UP, 'H3-asked');
    const execute = () => card().locator('.ldh-chat-execute');
    await until(execute().waitFor({ state: 'visible', timeout: MODEL }), 'the write plan, waiting for Execute');
    const ops = await card().locator('.ldh-chat-step .op').allTextContents();
    if (!ops.some((o) => /AddObjectBlock/.test(o))) throw new Error(`H3: the plan does not place the chart: ${ops.join(' ')}`);
    await easeScrollTo(card(), { ms: 1200, margin: 200 }); await sleep(1500);
    await marks.beat('H3-plan', `waiting for Execute: ${ops.map((o) => o.trim()).join(', ')}`, await focus(card()));
    await sleep(2500);
    await cursor.moveTo(...(await centre(execute())), { duration: 700 });
    await sleep(500);
    await marks.beat('H3-execute', 'pointer on Execute', await focus(card()));
    await cursor.click(execute());
    await until(card().locator('.ldh-chat-answer').filter({ hasText: /\S/ }).waitFor({ timeout: MODEL }), 'the write\'s answer');
    if (await card().locator('.ldh-chat-step.is-failed').count()) throw new Error('H3: a step failed');
    // the page catches up with the write: a block besides the chat, drawing a chart
    const placed = content.locator('> .ldh-block-row').filter({ hasNot: page.locator('.ldh-chat') }).last();
    await until(placed.locator('svg').first().waitFor({ state: 'visible', timeout: 90_000 }), 'the chart block on the page');
    await marks.beat('H3-written', 'executed: the page caught up', await focus(card()));
    await easeScrollTo(placed, { ms: 1600, margin: 200 }); await sleep(2500);
    const placedTitle = (await placed.locator('.ldh-block-head .ttl').first().textContent().catch(() => '')).trim();
    await marks.beat('H3-end', `the chart, a block of the page: ${placedTitle}`, await focus(placed));
    await sleep(1000);

    // ── H4 · the conversation stays ─────────────────────────────────────────────
    await marks.beat('H4-start', 'the page reloaded');
    await page.reload({ waitUntil: 'load' });
    await until(chat().locator('.ldh-chat-turn').nth(1).waitFor({ state: 'visible', timeout: 60_000 }), 'the stored chat with both turns');
    await sleep(2500);
    const turns = await chat().locator('.ldh-chat-turn').allTextContents();
    await easeScrollTo(chat(), { ms: 1600, margin: 200 }); await sleep(2000);
    await marks.beat('H4-chat', `the chat block, drawn from the store: ${JSON.stringify(turns)}`, await focus(chat()));
    await easeScrollTo(composer(), { ms: 1600, block: 'center' }); await sleep(2500);
    await marks.beat('H4-end', 'both turns and the composer under them', await focus(chat()));
    await sleep(800);
    await marks.beat('end');
  },
});
