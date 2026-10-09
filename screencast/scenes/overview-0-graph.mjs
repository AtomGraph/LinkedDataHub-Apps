// The overview's opening: an order in Graph mode, maximised to the whole frame, the camera
// orbiting it while the force layout settles - the graph and nothing else, as the teaser
// opened. Nothing is clicked on camera: the view's own Fullscreen button maximises the canvas
// (the `graph-3d-maximized` class, client/graph3d.xsl) before the opening beat, the canvas's
// controls and the pointer are hidden, and the motion is the camera's, driven through the
// ForceGraph3D instance the app keeps at LinkedDataHub.graphs. Dark, recorded on the 2880×1800
// viewport at zoom 1, where the canvas is native-sharp.
//
// Beats: 0.1-start when the graph is maximised, fitted and orbiting; 0.1-end where the first
// intro line hands over to the second; 0.2-end after that.
// Z1, the close, holds the 0.1-start frame.
import { runScene, resolve, geometryFrom, sleep, until } from '../lib/harness.mjs';
import { GEOMETRY_2X, load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const ORDER = '10423';
const OPENS_ON = `${base}/orders/${ORDER}/?mode=${encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode')}`;
// two intro lines over one orbit: 0.1 to 0.1-end, 0.2 from there to 0.2-end
const HOLD = 15_000;
const HOLD2 = 17_000;
// a full turn in this long reads as drift, not spin
const TURN_SECONDS = 60;

await runScene({
  id: 'overview-0-graph', target: OPENS_ON, warm: OPENS_ON, identity,
  geometry: geometryFrom(opts, GEOMETRY_2X),
  async body({ page, marks }) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, OPENS_ON, 'canvas', 3000);
    await page.locator('button.graph-3d-fullscreen').first().click();
    await until(page.waitForFunction(() => !!document.querySelector('.graph-3d-maximized'), null, { timeout: 10_000 }), 'the graph maximised');
    // The canvas's own controls, the library's navigation hint and the pointer go. The
    // maximised canvas is held to the full height (a later `.content-body > .graph-3d-canvas`
    // rule in ldh.css sets its height back to auto, 117 px short of the viewport), and the
    // renderer is resized to match
    await page.addStyleTag({ content: `
      .graph-3d-show-panel, .graph-3d-info-panel, .graph-3d-tooltip,
      .graph-3d-zoom, .graph-3d-fullscreen, .scene-nav-info { display: none !important; }
      .graph-3d-canvas.graph-3d-maximized { height: 100vh !important; }
      #__ldh-cursor { visibility: hidden !important; }` });
    await sleep(500);

    // fitted, then orbiting the graph's centre from a little inside the fitted distance, closing in
    // over the hold; the loop keeps running until the take ends
    const orbit = await page.evaluate(({ turn, hold }) => {
      const entries = Object.entries(window.LinkedDataHub?.graphs ?? {});
      const live = entries.filter(([id]) => document.getElementById(id)?.closest('.graph-3d-maximized')).at(-1) ?? entries.at(-1);
      if (!live) return { ok: false };
      const fg = live[1].instance ?? live[1];
      // the page's own dark ground behind the graph, not the canvas's transparency
      const ground = getComputedStyle(document.body).backgroundColor;
      fg.width(innerWidth).height(innerHeight).backgroundColor(ground);
      fg.zoomToFit(0, 40);
      const box = fg.getGraphBbox();
      const c = { x: (box.x[0] + box.x[1]) / 2, y: (box.y[0] + box.y[1]) / 2, z: (box.z[0] + box.z[1]) / 2 };
      const cam = fg.cameraPosition();
      const dx = cam.x - c.x, dz = cam.z - c.z;
      const r0 = Math.hypot(dx, dz), a0 = Math.atan2(dx, dz), y = cam.y;
      const start = performance.now();
      const step = (now) => {
        const t = (now - start) / 1000;
        const a = a0 + (2 * Math.PI * t) / turn;
        const r = r0 * (0.8 - 0.2 * Math.min(1, (t * 1000) / hold));
        fg.cameraPosition({ x: c.x + r * Math.sin(a), y, z: c.z + r * Math.cos(a) }, c);
        window.__ldhOrbit = requestAnimationFrame(step);
      };
      window.__ldhOrbit = requestAnimationFrame(step);
      return { ok: true, nodes: fg.graphData().nodes.length };
    }, { turn: TURN_SECONDS, hold: HOLD + HOLD2 });
    if (!orbit.ok) throw new Error('no graph instance to orbit');
    await sleep(1200);
    await marks.beat('0.1-start', `the order as a graph, maximised and orbiting: ${orbit.nodes} nodes`);
    await sleep(HOLD);
    await marks.beat('0.1-end', 'still orbiting: the second intro line starts');
    await sleep(HOLD2);
    await marks.beat('0.2-end', 'closed in');
    await sleep(800);
    await marks.beat('end');
  },
});
