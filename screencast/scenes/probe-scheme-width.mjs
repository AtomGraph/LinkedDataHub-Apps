// Read-only: for the overview's E4 — does the page follow a colour-scheme change live,
// without a reload, and what does the recording show when the viewport narrows to a
// phone width mid-take? Stills of each state, plus the recorded video's frame size.
import { runScene, resolve, geometryFrom, sleep } from '../lib/harness.mjs';

const opts = await resolve('/territories/');
const { target, identity } = opts;

const r = await runScene({
  id: 'probe-scheme-width', target, identity,
  geometry: geometryFrom(opts, { width: 1440, height: 900, deviceScaleFactor: 1 }),
  async body({ page, shot }) {
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const scheme = () => page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForSelector('.ldh-pane.is-active .ldh-block, canvas', { timeout: 30_000 });
    await sleep(5000);
    console.log('  dark:', await scheme(), await bg());
    await shot('dark');

    // The switch, live: no navigation, just the media feature changing under the page.
    await page.emulateMedia({ colorScheme: 'light' });
    await sleep(1500);
    console.log('  after switch:', await scheme(), await bg(), 'url unchanged:', page.url() === target);
    await shot('light');

    // Narrow to a phone, in two steps so the responsive breakpoints at 1024 and 768 show.
    for (const width of [1000, 740, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await sleep(2500);
      const layout = await page.evaluate(() => ({
        bodyW: document.body.clientWidth, scrollW: document.documentElement.scrollWidth,
        drawerOpen: !!document.querySelector('.ldh-drawer.is-open, [class*="drawer"][aria-expanded="true"]'),
        actionBarTiers: document.querySelectorAll('.ldh-actionbar, [class*="action-bar"], [class*="actionbar"]').length,
      }));
      console.log(`  width ${width}:`, JSON.stringify(layout));
      await shot(`w${width}`);
    }
    await sleep(1500);
  },
});

// What did the video record while the viewport was narrower than the recording?
import { spawnSync } from 'node:child_process';
if (r.trackPath) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', r.trackPath]);
  console.log('  video frame:', probe.stdout.toString().trim());
  const t = r.marks.entries.at(-1)?.at ?? 20;
  spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, t - 1.5)), '-i', r.trackPath, '-frames:v', '1', 'shots/probe-scheme-width/video-at-390.png']);
  console.log('  last video frame written to shots/probe-scheme-width/video-at-390.png');
}
