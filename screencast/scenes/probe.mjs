// Not a scene. Dumps the chrome a scene needs to drive, so selectors come from
// the running app rather than from memory.
//   node scenes/probe.mjs --path /customers/ [--base URL] [--cert-file P] [--anonymous]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, resolve, sleep } from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const where = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : '/customers/';
const { base, target, identity } = await resolve(where);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
  ...(identity ? { clientCertificates: identity } : {}),
});
await context.addCookies([
  { name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' },
]);
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

console.log(`probing ${target}`);
await page.goto(target, { waitUntil: 'load' });
await sleep(6000); // client-side rendering finishes well after load

const report = await page.evaluate(() => {
  const out = {};
  const brief = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: el.getAttribute('class') ?? '',
    id: el.id || undefined,
    text: (el.textContent ?? '').trim().slice(0, 60) || undefined,
    href: el.getAttribute('href') ?? undefined,
    title: el.getAttribute('title') ?? undefined,
  });

  out.title = document.title;
  out.url = location.href;

  // every class token in use, most frequent first — tells us the vocabulary
  const freq = new Map();
  for (const el of document.querySelectorAll('*')) {
    for (const c of el.classList) freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  out.classes = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 70)
    .map(([c, n]) => `${c}(${n})`);

  const grab = (sel) => [...document.querySelectorAll(sel)].slice(0, 12).map(brief);

  out.buttons = grab('button');
  out.toolbarish = grab('[class*="toolbar"], [class*="control"], [class*="mode"]');
  out.anchorsWithMode = [...document.querySelectorAll('a[href*="mode="]')]
    .slice(0, 12).map((a) => ({ text: a.textContent.trim().slice(0, 30), href: a.getAttribute('href') }));
  out.selects = [...document.querySelectorAll('select')].slice(0, 8).map((s) => ({
    cls: s.className,
    name: s.name || undefined,
    options: [...s.options].slice(0, 10).map((o) => o.textContent.trim()),
  }));
  out.inputs = [...document.querySelectorAll('input')].slice(0, 12).map((i) => ({
    cls: i.className, type: i.type, name: i.name || undefined, placeholder: i.placeholder || undefined,
  }));
  out.blocks = grab('[class*="block"]');
  out.headings = [...document.querySelectorAll('h1, h2, h3')].slice(0, 10)
    .map((h) => `${h.tagName}: ${h.textContent.trim().slice(0, 60)}`);

  // Subtrees a scene has to drive, shallow-rendered so the shape is legible.
  const tree = (el, depth = 0, max = 3) => {
    if (depth > max) return null;
    const kids = [...el.children].slice(0, 10).map((c) => tree(c, depth + 1, max)).filter(Boolean);
    const self = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 40);
    return kids.length ? { el: self, text: txt || undefined, kids } : { el: self, text: txt || undefined };
  };
  out.deep = {};
  for (const sel of ['.ldh-view-toolbar', '.modes-pop.view-mode-list', '.ldh-block-row', '.ldh-pivot-pill']) {
    const el = document.querySelector(sel);
    out.deep[sel] = el ? tree(el) : null;
  }
  out.blockTitles = [...document.querySelectorAll('.ldh-block')].map((b) => ({
    cls: b.className,
    about: b.getAttribute('about') ?? undefined,
    title: b.querySelector('h2, h3, .ttl')?.textContent.trim().slice(0, 50),
  }));
  return out;
});

report.pageErrors = errors;

const outFile = path.join(ROOT, 'tracks', `probe${where.replace(/[\/:]/g, '_')}.json`);
await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(report, null, 2) + '\n');
await page.screenshot({ path: outFile.replace(/\.json$/, '.png'), fullPage: false });

console.log(JSON.stringify(report, null, 2));
console.log(`\nwrote ${outFile}`);

await context.close();
await browser.close();
