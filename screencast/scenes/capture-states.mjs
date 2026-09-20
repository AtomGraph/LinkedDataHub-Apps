// Capturing real UI states as self-contained HTML — the assets a vector mock animates
// between. Each state: the active pane's markup with every computed style inlined,
// images as data URIs, fonts left to the system stack. Read-only apart from opening a
// form (never saved). SCHEME=dark captures the dark scheme.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
const OUT = 'mock/states';
let fontsDone = false;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: process.env.SCHEME ?? 'dark', ignoreHTTPSErrors: true, clientCertificates: identity ?? [] });
await ctx.addCookies([{ name: 'LinkedDataHub.first-time-message', value: 'true', domain: new URL(base).hostname, path: '/' }]);
await ctx.addInitScript(() => {
  let ol; Object.defineProperty(window, 'ol', { configurable: true, get() { return ol; }, set(v) { if (v && v.Map && !v.Map.__captured) { const Orig = v.Map; const C = function (...a) { const m = new Orig(...a); (window.__olMaps ||= []).push(m); return m; }; C.prototype = Orig.prototype; Object.setPrototypeOf(C, Orig); C.__captured = true; v.Map = C; } ol = v; } });
});
const page = await ctx.newPage();

// Serialise `selector` as it is — classes and all — with images as data URIs and the
// canvases as PNGs. The app's own stylesheets are captured once beside it, so the mock
// renders with the rules the app renders with, not a re-derivation of them.
let cssDone = false;
async function snapshot(selector, name) {
  if (!cssDone) {
    // Every stylesheet the page links, by SOURCE — cssRules omits what @import pulls in
    // (app.css imports the design-system kit core.css, where buttons, inputs and the
    // icon face live). Imports are inlined recursively, url()s become data URIs.
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).concat([...document.querySelectorAll('style')].map((st) => 'inline:' + st.textContent)));
    const seen = new Set();
    const fetchText = async (url) => { const r = await page.request.get(url).catch(() => null); return r && r.ok() ? await r.text() : ''; };
    const inlineUrls = async (text, from) => {
      const urls = [...new Set([...text.matchAll(/url\((["']?)([^"')]+)\1\)/g)].map((m) => m[2]))].filter((u) => !u.startsWith('data:') && !u.startsWith('#'));
      for (const u of urls) { const abs = new URL(u, from).href; const r = await page.request.get(abs).catch(() => null); if (!r || !r.ok()) continue; const buf = await r.body(); const ct = r.headers()['content-type'] ?? 'application/octet-stream'; text = text.split(`url(${u})`).join(`url(data:${ct};base64,${buf.toString('base64')})`).split(`url("${u}")`).join(`url("data:${ct};base64,${buf.toString('base64')}")`).split(`url('${u}')`).join(`url('data:${ct};base64,${buf.toString('base64')}')`); }
      return text;
    };
    const expand = async (text, from) => {
      const imports = [...text.matchAll(/@import\s+(?:url\((["']?)([^"')]+)\1\)|(["'])([^"']+)\3)[^;]*;/g)];
      for (const m of imports) {
        const rel = m[2] ?? m[4]; const abs = new URL(rel, from).href;
        let sub = '';
        if (!seen.has(abs)) { seen.add(abs); sub = await expand(await fetchText(abs), abs); }
        text = text.replace(m[0], `/* ${abs} */\n${sub}\n`);
      }
      return inlineUrls(text, from);
    };
    let css = '';
    for (const h of hrefs) {
      if (h.startsWith('inline:')) { css += `/* inline */\n${await inlineUrls(h.slice(7), base)}\n`; continue; }
      if (seen.has(h)) continue; seen.add(h);
      css += `/* ${h} */\n${await expand(await fetchText(h), h)}\n`;
    }
    await fs.writeFile(`${OUT}/app.css`, css);
    const html = await page.evaluate(() => ({ htmlAttrs: [...document.documentElement.attributes].map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join(' '), bodyClass: document.body.className }));
    await fs.writeFile(`${OUT}/app.json`, JSON.stringify(html, null, 2));
    console.log(`  css: ${seen.size} sheets (imports inlined), ${Math.round(css.length / 1024)} KB`);
    cssDone = true;
  }
  const html = await page.evaluate(async (sel) => {
    const root = sel === 'MODAL' ? [...document.querySelectorAll('.modal-constructor, .ac-modal')].filter((m) => m.offsetParent !== null).at(-1) : document.querySelector(sel);
    if (!root) return null;
    const toDataUri = async (src) => { try { const r = await fetch(src); const b = await r.blob(); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch { return null; } };
    const clone = root.cloneNode(true);
    const src = root.querySelectorAll('*'), dst = clone.querySelectorAll('*');
    for (let i = 0; i < src.length; i++) {
      if (src[i] instanceof HTMLInputElement || src[i] instanceof HTMLTextAreaElement) dst[i].setAttribute('value', src[i].value);
      if (src[i] instanceof HTMLSelectElement) dst[i].querySelectorAll('option').forEach((x, j) => { if (j === src[i].selectedIndex) x.setAttribute('selected', ''); else x.removeAttribute('selected'); });
      if (src[i] instanceof HTMLImageElement && src[i].src && !src[i].src.startsWith('data:')) { const d = await toDataUri(src[i].src); if (d) dst[i].setAttribute('src', d); }
      if (src[i] instanceof HTMLCanvasElement) { try { const img = document.createElement('img'); img.setAttribute('src', src[i].toDataURL('image/png')); img.setAttribute('class', src[i].className); img.setAttribute('style', src[i].getAttribute('style') ?? ''); img.width = src[i].clientWidth; img.height = src[i].clientHeight; dst[i].replaceWith(img); } catch {} }
      for (const a of [...dst[i].attributes]) if (a.name.startsWith('on')) dst[i].removeAttribute(a.name);
    }
    for (const s of clone.querySelectorAll('script')) s.remove();
    const r = root.getBoundingClientRect();
    return { html: clone.outerHTML, box: { x: r.x, y: r.y, w: r.width, h: r.height }, bg: getComputedStyle(document.body).backgroundColor };
  }, selector);
  if (!html) { console.log(`  ${name}: no ${selector}`); return; }
  await fs.writeFile(`${OUT}/${name}.html`, `<!-- ${JSON.stringify({ box: html.box, bg: html.bg })} -->\n${html.html}`);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ${name}: ${Math.round(html.html.length / 1024)} KB, box ${JSON.stringify(html.box)}`);
}

// state A: the region page with the Territory form open and filled (not saved)
await page.goto(`${base}/regions/4/`, { waitUntil: 'load' });
await page.waitForSelector('.ldh-pane.is-active button.add-instance', { timeout: 30_000 }); await page.waitForTimeout(2500);
await snapshot('.ldh-pane.is-active', 'region-page');
const btn = page.locator('.ldh-pane.is-active .ldh-block[data-for-class]').filter({ hasText: 'Cities in this region' }).first().locator('button.add-instance').first();
await btn.click();
const modal = page.locator('.modal-constructor:visible, .ac-modal:visible').last();
await modal.waitFor({ state: 'visible', timeout: 15_000 }); await page.waitForTimeout(1500);
for (const [re, val] of [['^Title', 'Amarillo'], ['^Name', 'Amarillo'], ['^Identifier', '79101'], ['Latitude|^Lat\\b', '35.2220'], ['Longitude|^Long\\b', '-101.8313']]) {
  const groups = modal.locator('.ldh-prop-group'); const c = await groups.count();
  for (let i = 0; i < c; i++) { const g = groups.nth(i); const label = ((await g.textContent()) ?? '').replace(/\s+/g, ' ').trim(); if (!new RegExp(re, 'i').test(label)) continue; const input = g.locator('input:not([type=hidden]):visible').first(); if (!(await input.count()) || await input.inputValue()) continue; await input.fill(val); break; }
}
await page.waitForTimeout(500);
await snapshot('MODAL', 'form-filled');
await page.keyboard.press('Escape');

// state B: the territories map (pins as data from the store, the canvas as a raster fallback)
await page.goto(`${base}/territories/`, { waitUntil: 'load' });
await page.waitForSelector('.ol-viewport canvas', { timeout: 30_000 }); await page.waitForTimeout(4000);
const pins = await page.evaluate(() => {
  const maps = (window.__olMaps || []);
  if (!maps.length) return null;
  const map = maps.at(-1); const rect = map.getTargetElement().getBoundingClientRect();
  const out = [];
  for (const layer of map.getLayers().getArray()) { const s = layer.getSource && layer.getSource(); if (!s || !s.getFeatures) continue; for (const f of s.getFeatures()) { const g = f.getGeometry(); if (!g || g.getType() !== 'Point') continue; const [x, y] = map.getPixelFromCoordinate(g.getCoordinates()); out.push({ id: f.getId(), x: Math.round(x), y: Math.round(y), label: f.get('name') || f.get('label') || '' }); } }
  return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, pins: out };
});
await fs.writeFile(`${OUT}/map-pins.json`, JSON.stringify(pins, null, 2));
console.log(`  map: ${pins ? pins.pins.length : 'no'} pins`);
await snapshot('.ldh-pane.is-active', 'territories-page');
{
  const vp = page.locator('.ldh-pane.is-active .ol-viewport').first();
  // tiles only: the pin layer is hidden for the shot (a style toggle in the page, nothing saved)
  await page.evaluate(() => { const m = (window.__olMaps || []).at(-1); if (!m) return; for (const l of m.getLayers().getArray()) if (l.getSource && l.getSource() && l.getSource().getFeatures) l.setVisible(false); });
  await page.waitForTimeout(800);
  await vp.screenshot({ path: `${OUT}/map-tiles.png` });
  await page.evaluate(() => { const m = (window.__olMaps || []).at(-1); if (!m) return; for (const l of m.getLayers().getArray()) l.setVisible(true); });
  const b = await vp.boundingBox(); await fs.writeFile(`${OUT}/map-box.json`, JSON.stringify(b));
  console.log(`  map tiles: ${JSON.stringify(b)}`);
}
await browser.close();
