// Not a scene. How a label and its control are related on the inline form, so a
// field can be filled by name instead of by position.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { create } from '../lib/constructors.mjs';

const { base, target, identity } = await resolve('/scratch-briefing/');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 810 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
const page = await context.newPage();
const plain = { click: async (l) => l.click() };
await page.goto(target, { waitUntil: 'load' });
await sleep(3500);
await switchDocumentMode(page, plain, 'read-mode');
await sleep(3000);
await create(page, plain, 'View');
await sleep(3000);

console.log('pane exists:', await page.evaluate(() => !!document.querySelector('.ldh-pane.is-active')));
console.log('visible controls:', await page.evaluate(() => {
  const pane = document.querySelector('.ldh-pane.is-active') ?? document.body;
  return JSON.stringify([...pane.querySelectorAll('input:not([type=hidden]), select, textarea')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/)[0] || '-'}[${e.getAttribute('name') ?? e.type}]`), null, 1);
}));
console.log('label-ish text near controls:', await page.evaluate(() => {
  const pane = document.querySelector('.ldh-pane.is-active') ?? document.body;
  return JSON.stringify([...pane.querySelectorAll('input:not([type=hidden]), select, textarea')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => {
      let row = e.closest('div');
      for (let i = 0; i < 4 && row; i++) {
        const txt = [...row.childNodes].filter((n) => n.nodeType === 1 && !n.contains(e))
          .map((n) => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
        if (txt) return `${e.getAttribute('name') ?? e.type} ← "${txt.slice(0, 40)}" (${row.className || row.tagName})`;
        row = row.parentElement;
      }
      return `${e.getAttribute('name') ?? e.type} ← (no label found)`;
    }), null, 1);
}));
console.log('property rows:', await page.evaluate(() => {
  const pane = document.querySelector('.ldh-pane.is-active') ?? document.body;
  const rows = [...pane.querySelectorAll('[class*="prop"], .ldh-prop-row, tr, .row')].filter((e) => e.offsetParent !== null && e.querySelector('input:not([type=hidden]), select, textarea'));
  return JSON.stringify(rows.slice(0, 8).map((r) => ({
    cls: String(r.className).trim().slice(0, 40),
    text: r.textContent.replace(/\s+/g, ' ').trim().slice(0, 46),
    control: (() => { const c = r.querySelector('input:not([type=hidden]), select, textarea'); return c ? `${c.tagName.toLowerCase()}[${c.getAttribute('name') ?? c.type}]` : null; })(),
  })), null, 1);
}));
console.log(await page.evaluate(() => {
  const pane = document.querySelector('.ldh-pane.is-active') ?? document.body;
  const labels = [...pane.querySelectorAll('.ac-label, label, .lbl')].filter((e) => e.offsetParent !== null);
  return JSON.stringify(labels.slice(0, 8).map((l) => {
    // walk up until a container that holds exactly one control
    let row = l.parentElement, found = null, depth = 0;
    while (row && depth < 5) {
      const ctrls = [...row.querySelectorAll('input:not([type=hidden]), select, textarea')];
      if (ctrls.length >= 1) { found = { depth, container: `${row.tagName.toLowerCase()}.${String(row.className).trim().split(/\s+/)[0] || '-'}`, controls: ctrls.length, first: `${ctrls[0].tagName.toLowerCase()}.${String(ctrls[0].className).trim().split(/\s+/)[0] || '-'}[${ctrls[0].getAttribute('name') ?? ''}]` }; break; }
      row = row.parentElement; depth++;
    }
    return { label: l.textContent.trim().slice(0, 18), for: l.getAttribute('for') ?? null, ...found };
  }), null, 1);
}));
await context.close(); await browser.close();
