// Calibration: does the recorded video's clock match the marks clock? A page shows the
// wall clock in large digits (updated on every animation frame, then frozen for a
// stretch to simulate an idle page); beats fire at known wall-clock times; the frames
// at those beat times are read back and compared.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';
const opts = await resolve('/');
const { base, identity } = opts;
await runScene({ id: 'probe-clock', target: base + '/', identity, geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }), overlays: { cursor: false },
  async body({ page, marks }) {
    const t0 = Date.now();
    await page.setContent(`<body style="margin:0;background:#fff;font:bold 160px monospace;display:flex;align-items:center;justify-content:center;height:100vh"><div id=c>0</div><script>
      const t0 = ${t0}; let frozen = false; window.freeze = (f) => { frozen = f; };
      (function tick(){ if (!frozen) document.getElementById('c').textContent = ((Date.now() - t0)/1000).toFixed(2); requestAnimationFrame(tick); })();
    </script></body>`);
    const log = async (name) => { await marks.beat(name, `wall ${((Date.now() - t0) / 1000).toFixed(2)}`); };
    await sleep(1500); await log('b1');
    await sleep(2000); await log('b2');
    await page.evaluate(() => window.freeze(true));   // idle: nothing repaints for 4 s
    await sleep(4000); await log('b3-frozen');
    await page.evaluate(() => window.freeze(false));
    await sleep(500); await log('b4');
    await sleep(2000); await log('b5');
    // heavy repaint: animate a big box for 3 s
    await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:400px;background:#36c'; document.body.appendChild(d); let x = 0; (function mv(){ x = (x + 7) % 1000; d.style.left = x + 'px'; requestAnimationFrame(mv); })(); });
    await sleep(3000); await log('b6');
    await sleep(500);
  } });
