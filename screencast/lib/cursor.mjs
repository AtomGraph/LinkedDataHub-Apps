// A scripted pointer leaves no trace on screen: page.mouse.move() dispatches real
// mousemove events but paints no cursor, so an unedited recording shows a UI
// operating itself with nothing touching it.
//
// The dot is not animated from Node. It listens for the mousemove events the real
// pointer already emits, so it tracks the pointer exactly and costs no extra IPC —
// Node only has to walk the mouse along an eased path.

export const CURSOR_INIT = `(() => {
  if (window.__ldhCursorInstalled) return;
  window.__ldhCursorInstalled = true;

  const install = () => {
    if (!document.body || document.getElementById('__ldh-cursor')) return;

    const style = document.createElement('style');
    style.textContent = \`
      #__ldh-cursor {
        position: fixed; top: 0; left: 0; width: 22px; height: 22px;
        margin: -11px 0 0 -11px; border-radius: 50%;
        background: rgba(20, 20, 20, .58);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, .92), 0 2px 6px rgba(0, 0, 0, .35);
        pointer-events: none; z-index: 2147483647;
        transition: width .12s ease, height .12s ease, margin .12s ease;
        will-change: transform;
      }
      #__ldh-cursor.is-down { width: 16px; height: 16px; margin: -8px 0 0 -8px; }
      .__ldh-ripple {
        position: fixed; top: 0; left: 0; width: 18px; height: 18px;
        margin: -9px 0 0 -9px; border-radius: 50%;
        border: 2px solid rgba(20, 20, 20, .5);
        pointer-events: none; z-index: 2147483646;
        animation: __ldh-ripple .5s ease-out forwards;
      }
      @keyframes __ldh-ripple {
        from { opacity: .9; transform: var(--at) scale(.5); }
        to   { opacity: 0;  transform: var(--at) scale(3.2); }
      }
    \`;
    document.head.appendChild(style);

    const dot = document.createElement('div');
    dot.id = '__ldh-cursor';
    dot.style.transform = 'translate(-100px, -100px)';
    document.body.appendChild(dot);

    addEventListener('mousemove', (e) => {
      dot.style.transform = \`translate(\${e.clientX}px, \${e.clientY}px)\`;
    }, true);

    addEventListener('mousedown', (e) => {
      dot.classList.add('is-down');
      const r = document.createElement('div');
      r.className = '__ldh-ripple';
      r.style.setProperty('--at', \`translate(\${e.clientX}px, \${e.clientY}px)\`);
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 520);
    }, true);

    addEventListener('mouseup', () => dot.classList.remove('is-down'), true);
  };

  // The app re-renders whole regions client-side; if the body is replaced the dot
  // goes with it, so put it back. documentElement does not exist yet at
  // document-start, which is when init scripts run, so this waits for the DOM.
  const watch = () => {
    install();
    if (document.documentElement) {
      new MutationObserver(install).observe(document.documentElement, { childList: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();`;

// A still destined for the docs should not carry a pointer that is not really
// there, so the dot is hidden for the duration of a screenshot.
export async function withCursorHidden(page, fn) {
  await page.evaluate(() => {
    const d = document.getElementById('__ldh-cursor');
    if (d) d.style.visibility = 'hidden';
  }).catch(() => {});
  try {
    return await fn();
  } finally {
    await page.evaluate(() => {
      const d = document.getElementById('__ldh-cursor');
      if (d) d.style.visibility = '';
    }).catch(() => {});
  }
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeCursor(page, { fps = 60 } = {}) {
  // Start off-screen bottom-right, the way a pointer that just entered the frame would.
  let at = { x: 1200, y: 980 };

  async function moveTo(x, y, { duration = 650 } = {}) {
    const frames = Math.max(2, Math.round((duration / 1000) * fps));
    const from = { ...at };
    const frameMs = duration / frames;

    for (let i = 1; i <= frames; i++) {
      const k = easeInOutCubic(i / frames);
      const started = Date.now();
      await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
      const spent = Date.now() - started;
      if (spent < frameMs) await sleep(frameMs - spent);
    }
    at = { x, y };
  }

  async function centreOf(locator) {
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('cursor: target has no bounding box');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  return {
    get position() { return { ...at }; },

    moveTo,

    async moveOver(locator, opts) {
      const { x, y } = await centreOf(locator);
      await moveTo(x, y, opts);
    },

    // A real pointer settles before it presses, and the press is visible for a beat
    // after. Both pauses are what stop playback reading as a macro.
    async click(locator, { duration = 650, settle = 180, after = 260 } = {}) {
      const { x, y } = await centreOf(locator);
      await moveTo(x, y, { duration });
      await sleep(settle);
      await page.mouse.down();
      await sleep(90);
      await page.mouse.up();
      await sleep(after);
    },

    async clickAt(x, y, { duration = 650, settle = 180, after = 260 } = {}) {
      await moveTo(x, y, { duration });
      await sleep(settle);
      await page.mouse.down();
      await sleep(90);
      await page.mouse.up();
      await sleep(after);
    },
  };
}
