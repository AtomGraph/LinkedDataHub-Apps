import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
await p.goto('file://' + process.cwd() + '/objtest.html');
await p.waitForTimeout(3000);
console.log(await p.evaluate(async () => {
  const obj = document.querySelector('object');
  const vid = document.querySelector('video');
  const r = (e) => { const x = e.getBoundingClientRect(); return `${Math.round(x.width)}x${Math.round(x.height)}`; };
  let inner = 'n/a';
  try { inner = obj.contentDocument ? (obj.contentDocument.querySelector('video') ? 'contains a <video>' : 'document, no video') : 'no contentDocument'; } catch (e) { inner = 'blocked: ' + e.message; }
  let played = false;
  try { vid.muted = true; await vid.play(); played = !vid.paused; } catch (e) { played = 'error: ' + e.message; }
  return JSON.stringify({ objectBox: r(obj), objectInner: inner, videoBox: r(vid), videoReadyState: vid.readyState, videoPlays: played }, null, 1);
}));
await p.screenshot({ path: 'objtest.png' });
await b.close();
