// One continuous scroll, driven a frame at a time.
//
// scrollTo({ behavior: 'smooth' }) hands the animation to the browser, whose
// duration is its own business — so a sequence of them fired on a timer interrupts
// each animation with the next and the picture stutters. Animating it here instead
// puts one position on screen per frame for exactly as long as asked, and an
// ease-in-out means it starts and stops gently rather than snapping into motion.
export async function glideTo(page, y, ms = 900) {
  await page.evaluate(([to, dur]) => new Promise((done) => {
    const from = window.scrollY;
    const delta = Math.max(0, to) - from;
    if (!delta || dur <= 0) { window.scrollTo(0, Math.max(0, to)); return done(); }
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      window.scrollTo(0, from + delta * ease(t));
      if (t < 1) requestAnimationFrame(frame); else done();
    };
    requestAnimationFrame(frame);
  }), [y, ms]);
}

// Framing a control and its effect together.
//
// A block that carries controls — a chart's axes, a view's mode, a query editor —
// renders its result in a container somewhere below them. Scrolling to the control
// alone films a switch being flipped with nothing visibly happening; scrolling to
// the result alone films an effect with no cause. Both have to be in the viewport
// at the moment the control is used.
//
// When the pair is taller than the viewport the result wins, because the effect is
// what the beat is about.

export async function frameTogether(page, controls, result, { headerPx = 120, pad = 20, settle = 800, prefer = 'result' } = {}) {
  const c = await controls.boundingBox().catch(() => null);
  const r = await result.boundingBox().catch(() => null);
  if (!c) return 'no controls';

  const { height: vh } = page.viewportSize();
  const scrollY = await page.evaluate(() => window.scrollY);

  // Put the controls just under the sticky header.
  let top = scrollY + c.y - headerPx - pad;

  if (r) {
    const pair = r.y + r.height - c.y;
    if (pair > vh - headerPx - pad * 2 && prefer === 'result') {
      // Cannot fit both: bias to the bottom of the result, keeping as much of the
      // controls on screen as the remainder allows. Callers whose beat is about the
      // controls — a toolbar showing the route taken — pass prefer: 'controls'.
      top = scrollY + r.y + r.height - vh + pad;
    }
  }

  await glideTo(page, top, 700);
  await page.waitForTimeout(settle);

  // Report what actually ended up on screen, so a scene can mark it honestly.
  return page.evaluate(([cSel, rSel, header]) => {
    const vis = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const top = Math.max(b.top, header);
      const bottom = Math.min(b.bottom, innerHeight);
      return b.height ? Math.round(Math.max(0, bottom - top) / b.height * 100) : 0;
    };
    return {
      controls: vis(document.querySelector(cSel)),
      result: vis(document.querySelector(rSel)),
    };
  }, [await selectorOf(controls), await selectorOf(result), headerPx]).catch(() => 'measured');
}

// Playwright locators are not selectors, so the visibility check needs something it
// can run in the page. Scenes pass simple class locators, so the class is enough.
async function selectorOf(locator) {
  try {
    return await locator.evaluate((el) => {
      const cls = String(el.className).trim().split(/\s+/)[0];
      return cls ? `.${cls}` : el.tagName.toLowerCase();
    });
  } catch {
    return 'body';
  }
}

// Reading a page back.
//
// Ending on a jump to the top shows only the opening paragraph when the page
// carries a tall block. A story is only legible in sequence, so the close scrolls
// through it at a readable pace.
export async function scrollThrough(page, { duration = 6000, settle = 900 } = {}) {
  await glideTo(page, 0, 450);
  await page.waitForTimeout(settle);

  const height = await page.evaluate(() => Math.max(0, document.body.scrollHeight - innerHeight));
  if (height <= 0) return 0;

  // The whole way down as a single animation, rather than a staircase of separate
  // smooth scrolls that cut each other off.
  await glideTo(page, height, duration);
  await page.waitForTimeout(settle);
  return height;
}
