// Not a scene. The facet popover loads its values over HTTP behind an
// indeterminate progress bar, and the pivot pills render hidden until something
// reveals them. This watches both, with the network and console attached.
import { chromium } from 'playwright';
import { resolve, sleep } from '../lib/harness.mjs';

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

page.on('console', (m) => { if (m.type() === 'error') console.log('  console.error:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('  pageerror:', e.message.slice(0, 200)));
page.on('requestfailed', (r) => console.log('  requestfailed:', r.method(), r.url().slice(0, 120), r.failure()?.errorText));
page.on('response', (r) => {
  if (r.status() >= 400) console.log('  HTTP', r.status(), r.request().method(), r.url().slice(0, 140));
});

await page.goto(target, { waitUntil: 'load' });
await page.locator('.ldh-view-toolbar').first().waitFor({ state: 'visible', timeout: 45_000 });
await sleep(1500);

console.log('\nopening facet…');
const t0 = Date.now();
const pending = new Map();
page.on('request', (r) => {
  if (/sparql|\/ns\b/.test(r.url())) {
    pending.set(r, Date.now());
    console.log(`  → ${((Date.now() - t0) / 1000).toFixed(1)}s ${r.method()} ${r.url().slice(0, 100)}`);
    const body = r.postData();
    if (body) console.log(`--- query ---\n${body}\n--- end ---`);
  }
});
page.on('requestfinished', (r) => {
  if (pending.has(r)) {
    console.log(`  ← ${((Date.now() - pending.get(r)) / 1000).toFixed(1)}s later, done`);
    pending.delete(r);
  }
});
await page.locator('.ldh-view-toolbar .left .facet button.facet-pill').first().click();

for (const wait of [1500, 3000, 6000, 12000, 20000]) {
  await sleep(wait === 1500 ? 1500 : 3000);
  const snap = await page.evaluate(() => {
    const pop = document.querySelector('.facet-pop:not(.sort-pop)');
    const vals = pop?.querySelector('.facet-values');
    return {
      loading: !!pop?.querySelector('.facet-loading'),
      childCount: vals ? vals.children.length : -1,
      html: vals ? vals.innerHTML.replace(/\s+/g, ' ').slice(0, 500) : null,
    };
  });
  console.log(`  +${wait}ms loading=${snap.loading} children=${snap.childCount}`);
  if (!snap.loading && snap.childCount > 0) { console.log('  values:', snap.html); break; }
  if (wait === 20000) console.log('  last html:', snap.html);
}

console.log('\npivot pill ancestry (why Playwright sees it as hidden):');
console.log(await page.evaluate(() => {
  const e = document.querySelector('.ldh-pivot-pill');
  if (!e) return 'none';
  const chain = [];
  for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    chain.push({
      el: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\s+/).join('.') : ''),
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      overflow: cs.overflow, contentVisibility: cs.contentVisibility,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      clipPath: cs.clipPath !== 'none' ? cs.clipPath : undefined,
    });
  }
  return JSON.stringify({ checkVisibility: e.checkVisibility?.(), chain }, null, 1);
}));

console.log('\npivot pills:');
console.log(await page.evaluate(() => JSON.stringify([...document.querySelectorAll('.ldh-pivot-pill')].map((e) => {
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  const parent = e.closest('[class]');
  return {
    text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
    dir: e.dataset.dir,
    box: `${Math.round(r.width)}x${Math.round(r.height)}`,
    display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    parentCls: parent?.className?.slice?.(0, 60),
    parentHidden: e.offsetParent === null,
  };
}), null, 1)));

await context.close();
await browser.close();
