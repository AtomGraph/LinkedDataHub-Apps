// Clicking a map marker.
//
// OpenLayers draws markers onto a canvas, so there is no element to target, and
// map.xsl passes the map object through event context rather than leaving it
// anywhere reachable. A blind search grid does not work either: a pin is about
// 14px wide, so any grid coarse enough to run quickly steps straight over them.
//
// What does work is reading the pixels. The pins are a saturated blue that nothing
// in an OpenStreetMap basemap comes close to — water is pale and nearly neutral
// between green and blue — so scanning finds every pin, and clustering gives their
// centres. The scene then clicks one deliberately, on camera, first time.
//
// The pixels come from a screenshot rather than from the canvas: OSM tiles are
// cross-origin, which taints it, and getImageData is refused. ffmpeg decodes the
// PNG to raw RGBA, so this needs no image library.

import { spawn } from 'node:child_process';
import { ui } from './dom.mjs';

const INFO = '.ol-overlay-container .ac-modal-body';
const CLOSE = '.ol-overlay-container .ac-modal-head button';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decodes a PNG buffer to raw RGBA using ffmpeg, so no image library is needed.
function decode(png) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (d) => chunks.push(d));
    ff.stderr.on('data', (d) => (err += d));
    ff.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg decode failed: ${err.slice(-400)}`))));
    ff.stdin.on('error', () => {});
    ff.stdin.end(png);
  });
}

// Returns candidate pin centres in viewport coordinates, strongest cluster first.
//
// The screenshot is taken of the whole viewport rather than clipped to the map:
// boundingBox() reports viewport coordinates while screenshot({clip}) takes page
// coordinates, and once the page is scrolled those differ by the scroll offset.
// Capturing the viewport keeps one coordinate system throughout — the same one
// mouse.click() expects — and the map's box is used as a mask instead, which also
// keeps the app's own blue chrome out of the results.
export async function findMarkers(page, { viewportSelector = '.ol-viewport' } = {}) {
  const box = await ui(page).locator(viewportSelector).first().boundingBox().catch(() => null);
  if (!box) return { error: 'no map viewport' };

  const { width: vw, height: vh } = page.viewportSize();

  // The app's own chrome is blue and some of it sits over the map — the pinned
  // "+ XHTML" and "+ Object" buttons especially. Clicking one does not just miss,
  // it opens a form and shifts the map out from under every later candidate. So
  // their real rectangles are taken from the DOM and excluded outright.
  const chrome = await page.evaluate(() => [...document.querySelectorAll(
    'button, .ac-btn, .ac-iconbtn, .ldh-pin-ic, .ol-control, a.ac-btn, .ac-tag, .ldh-pivot-pill, .facet-pill',
  )]
    .filter((e) => e.offsetParent !== null)
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ left: r.left - 3, top: r.top - 3, right: r.right + 3, bottom: r.bottom + 3 })));
  const mask = {
    left: Math.max(0, box.x) + 6,
    top: Math.max(0, box.y) + 6,
    right: Math.min(box.x + box.width, vw) - 6,
    bottom: Math.min(box.y + box.height, vh) - 6,
  };
  if (mask.right - mask.left < 40 || mask.bottom - mask.top < 40) return { error: 'map is not on screen' };

  const png = await page.screenshot();
  const rgba = await decode(png);

  // Playwright renders at deviceScaleFactor, so the buffer is larger than the CSS
  // viewport by exactly that factor.
  const scale = Math.sqrt((rgba.length / 4) / (vw * vh));
  const width = Math.round(vw * scale);
  const height = Math.round(vh * scale);

  const hits = [];
  const step = 2;
  for (let y = Math.round(mask.top * scale); y < mask.bottom * scale; y += step) {
    for (let x = Math.round(mask.left * scale); x < mask.right * scale; x += step) {
      const i = (y * width + x) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (b > 110 && b - r > 70 && b - g > 45) hits.push([x, y]);
    }
  }
  if (!hits.length) return { error: 'no marker-coloured pixels found', scanned: `${width}x${height}` };

  const clusters = [];
  const radius = 18 * scale;
  for (const [x, y] of hits) {
    let found = null;
    for (const c of clusters) {
      if (Math.abs(c.cx - x) <= radius && Math.abs(c.cy - y) <= radius) { found = c; break; }
    }
    if (found) {
      found.n++; found.sx += x; found.sy += y;
      found.cx = found.sx / found.n; found.cy = found.sy / found.n;
      found.x0 = Math.min(found.x0, x); found.x1 = Math.max(found.x1, x);
      found.y0 = Math.min(found.y0, y); found.y1 = Math.max(found.y1, y);
    } else {
      clusters.push({ n: 1, sx: x, sy: y, cx: x, cy: y, x0: x, x1: x, y0: y, y1: y });
    }
  }

  // The app's own chrome is blue too, and it sits over the map: the pinned
  // "+ XHTML" and "+ Object" buttons are the widest blue things on screen. A pin is
  // about 14 CSS px across, so shape separates them — the buttons are an order of
  // magnitude wider and far denser than any marker.
  const maxSide = 34 * scale;
  const inChrome = (x, y) => chrome.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);

  const markers = clusters
    .filter((c) => c.n >= 6 && (c.x1 - c.x0) <= maxSide && (c.y1 - c.y0) <= maxSide * 1.6)
    .map((c) => ({
      x: c.cx / scale,
      y: c.cy / scale,
      weight: c.n,
      size: `${Math.round((c.x1 - c.x0) / scale)}x${Math.round((c.y1 - c.y0) / scale)}`,
    }))
    .filter((m) => !inChrome(m.x, m.y))
    // The pin is a teardrop: its blue mass is the head, and OpenLayers hit-tests
    // around the icon's anchor a few pixels lower.
    .map((m) => ({ ...m, y: m.y + 4 }))
    .sort((a, b) => b.weight - a.weight);

  return { markers, clusters: clusters.length, rejected: clusters.length - markers.length, scale };
}

// Clicks candidates in turn until one opens its info window, so a cluster that was
// a label rather than a pin costs one attempt instead of the whole beat.
export async function openMarker(page, cursor, markers, { after = 2400, tries = 5 } = {}) {
  for (const m of markers.slice(0, tries)) {
    await cursor.clickAt(m.x, m.y, { duration: 850, settle: 220, after: 500 });
    await sleep(800);
    if (await ui(page).locator(INFO).count()) {
      const label = (await ui(page).locator(INFO).first().textContent().catch(() => '')).replace(/\s+/g, ' ').trim();
      await sleep(after);
      return label.slice(0, 48);
    }
  }
  return null;
}

export async function closeInfo(page) {
  const close = ui(page).locator(CLOSE).first();
  if (await close.count()) {
    await close.click().catch(() => {});
    await sleep(700);
  }
}

export const INFO_SELECTOR = INFO;

// The pin of a known resource, as a page coordinate.
//
// The harness captures every ol.Map the page builds (window.__olMaps), and each
// feature's id is the resource URI (map.xsl:254). The visible map is asked for the
// pixel of the first wanted feature that stands clear of every unwanted one, so the
// click lands on the pin meant and no other. `ids` are resource URIs.
export async function locateMarker(page, ids, { clearance = 16 } = {}) {
  return page.evaluate(({ ids, clearance }) => {
    const want = new Set(ids);
    const maps = (window.__olMaps || []).filter((m) => { const el = m.getTargetElement(); return el && el.offsetParent !== null && el.getBoundingClientRect().width > 0; });
    if (!maps.length) return { error: 'no map on screen' };
    const map = maps[maps.length - 1];
    const rect = map.getTargetElement().getBoundingClientRect();
    const feats = [];
    for (const layer of map.getLayers().getArray()) {
      const src = layer.getSource && layer.getSource();
      if (!src || !src.getFeatures) continue;
      for (const f of src.getFeatures()) {
        const g = f.getGeometry(); if (!g || g.getType() !== 'Point') continue;
        const [x, y] = map.getPixelFromCoordinate(g.getCoordinates());
        feats.push({ id: f.getId(), x, y, wanted: want.has(f.getId()) });
      }
    }
    const inView = feats.filter((f) => f.x > 8 && f.y > 8 && f.x < rect.width - 8 && f.y < rect.height - 8);
    const wanted = inView.filter((f) => f.wanted);
    if (!wanted.length) return { error: `none of ${ids.length} resources has a pin in view (${feats.length} features)` };
    const clear = (f) => inView.every((o) => o.wanted || Math.hypot(o.x - f.x, o.y - f.y) >= clearance);
    // Prefer a pin the viewer can see right now; the map may run past the fold.
    const onScreen = (f) => rect.top + f.y > 40 && rect.top + f.y < window.innerHeight - 24;
    const pick = wanted.filter(onScreen).find(clear) || wanted.find(clear) || wanted[0];
    return { id: pick.id, x: rect.left + pick.x, y: rect.top + pick.y, isolated: clear(pick), onScreen: onScreen(pick), pins: inView.length };
  }, { ids, clearance });
}

// One click on the pin of a known resource, then the popup. The icon's anchor is
// its tip, so the click lands a few pixels up, in the head.
export async function clickMarker(page, cursor, ids, { after = 1800 } = {}) {
  let at = await locateMarker(page, ids);
  if (at.error) return { ok: false, why: at.error };
  if (!at.onScreen) {
    // Below the fold: scroll the page so the pin sits in the lower half, on camera.
    const dy = await page.evaluate((y) => Math.round(y - window.innerHeight * 0.62), at.y);
    await page.mouse.wheel(0, dy);
    await sleep(1200);
    at = await locateMarker(page, ids);
    if (at.error) return { ok: false, why: at.error };
  }
  await cursor.clickAt(at.x, at.y - 8, { duration: 850, settle: 220, after: 500 });
  await sleep(800);
  if (!(await ui(page).locator(INFO).count())) return { ok: false, why: `the pin at ${Math.round(at.x)},${Math.round(at.y)} opened no popup` };
  await sleep(after);
  const label = (await ui(page).locator('.ol-overlay-container').first().textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 48);
  return { ok: true, id: at.id, label, isolated: at.isolated };
}
