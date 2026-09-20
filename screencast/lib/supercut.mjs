// What a supercut take needs beyond a scene: 2× footage and focus boxes.
//
// The video is the viewport in CSS pixels, so 2× footage is a 2880×1800 viewport with
// the document zoomed 200 % — every helper still drives, because element boxes and
// pointer coordinates are both in the zoomed space. Each shot's beats carry the box of
// the component the gesture lands on, so the cutter can push the frame into it.
import { sleep } from './harness.mjs';

export const GEOMETRY_2X = { width: 2880, height: 1800, deviceScaleFactor: 1 };

export async function zoom2x(page) {
  await page.addInitScript(() => {
    const apply = () => { document.documentElement.style.zoom = '2'; };
    if (document.readyState !== 'loading') apply(); else document.addEventListener('DOMContentLoaded', apply);
  });
}

// The focus box of a locator (or of several: their union), as beat extra.
export async function focus(...locators) {
  let box = null;
  for (const l of locators) {
    // a box that is not there within a moment is not there: a beat must not wait 30 s on it
    const b = await l.boundingBox({ timeout: 2000 }).catch(() => null);
    if (!b) continue;
    box = box ? { x: Math.min(box.x, b.x), y: Math.min(box.y, b.y), x2: Math.max(box.x2, b.x + b.width), y2: Math.max(box.y2, b.y + b.height) } : { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height };
  }
  if (!box) return {};
  return { focus: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.x2 - box.x), h: Math.round(box.y2 - box.y) } };
}

export const centre = async (l) => { const b = await l.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };

// `load` waits for the window's load event — a page of 78 photographs on Rebrickable
// takes longer than Playwright's 30 s default — then for `ready`, then settles.
export const load = async (page, url, ready, settle = 2500, { timeout = 120_000 } = {}) => {
  await page.goto(url, { waitUntil: 'load', timeout });
  if (ready) await page.waitForSelector(ready, { timeout: 40_000 }).catch(() => {});
  await sleep(settle);
};

// A scroll the camera can follow: the page glides to the element over `ms` on an
// ease-in-out, so a static crop reads as a slow pan (the browser's own smooth scroll
// is a 300 ms lurch). `block` as for scrollIntoView.
export const easeScrollTo = (locator, { ms = 1400, block = 'start', margin = 0 } = {}) =>
  locator.evaluate((el, { ms, block, margin }) => new Promise((done) => {
    const r = el.getBoundingClientRect();
    const target = block === 'center' ? r.top + window.scrollY - (window.innerHeight - r.height) / 2
      : block === 'end' ? r.bottom + window.scrollY - window.innerHeight + margin
      : r.top + window.scrollY - margin;
    const from = window.scrollY, to = Math.max(0, Math.min(target, document.documentElement.scrollHeight - window.innerHeight));
    const t0 = performance.now();
    const step = (now) => { const u = Math.min(1, (now - t0) / ms); const k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; window.scrollTo(0, from + (to - from) * k); if (u < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  }), { ms, block, margin });

// The same glide to the top of the page, where a scene resets its scroll before the
// next gesture: an instant scrollTo(0, 0) is a jump no camera move can hide.
export const easeScrollTop = (page, { ms = 1400 } = {}) =>
  page.evaluate(({ ms }) => new Promise((done) => {
    const from = window.scrollY; if (!from) return done();
    const t0 = performance.now();
    const step = (now) => { const u = Math.min(1, (now - t0) / ms); const k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; window.scrollTo(0, from * (1 - k)); if (u < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  }), { ms });
