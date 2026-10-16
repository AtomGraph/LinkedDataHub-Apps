// The AtomGraph X (Twitter) header: a document in Graph mode, as the overview film opens -
// rendered as a still at 3:1. X takes a 1500×500 image, so the page is laid out at 3000×1000 and
// each still is downscaled 2:1 for sharpness.
//
// The graph is maximised by the view's own Fullscreen button, its controls, the pointer and every
// label sprite hidden (the labels are dataspace URIs, which have no place on a banner), on the
// page's own dark ground. Once the force layout has settled, the camera is turned round the graph
// and a still is taken every 30°, so the framing is picked from the stills rather than guessed.
//
//   node scenes/x-header.mjs --base … --cert-file … --cert-password-file … [--doc /orders/10423/ | --uri <external>] [--labels] [--label-scale 1.5] [--shift 0.2] [--zoom 0.85] [--align]
//
// Writes shots/x-header/<doc>-<angle>.png at 1500×500.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runScene, resolve, sleep, until, SHOTS } from '../lib/harness.mjs';
import { load } from '../lib/supercut.mjs';

const opts = await resolve('/');
const { base, identity } = opts;
const argv = process.argv.slice(2);
const DOC = argv.includes('--doc') ? argv[argv.indexOf('--doc') + 1] : '/orders/10423/';
// --uri: an external document, opened through the Linked Data browser instead of a dataspace document
const URI = argv.includes('--uri') ? argv[argv.indexOf('--uri') + 1] : null;
// --labels: keep the label sprites; a vocabulary's labels are words, a dataspace's are URIs
const LABELS = argv.includes('--labels');
const value = (name, fallback) => (argv.includes(`--${name}`) ? Number(argv[argv.indexOf(`--${name}`) + 1]) : fallback);
// --label-scale: labels drawn larger than the app draws them, to stay legible at 1500×500
const LABEL_SCALE = value('label-scale', 1);
// --shift: the share of the orbit radius the aim moves left, so the graph sits right of centre,
// clear of the profile picture X lays over the header's bottom-left
const SHIFT = value('shift', 0);
// --zoom: the camera's distance as a share of the fitted one; under 1 the dense core fills the band and
// the outliers (the RDF built-ins a vocabulary points at) fall off its edges
const ZOOM = value('zoom', 0.85);
// --align: orbit round the graph's longest axis and keep that axis horizontal, so the graph's widest
// spread runs along the 3:1 band whatever the angle
const ALIGN = argv.includes('--align');
const GRAPH_MODE = encodeURIComponent('https://w3id.org/atomgraph/client#GraphMode');
const TARGET = URI ? `${base}/?uri=${encodeURIComponent(URI)}&mode=${GRAPH_MODE}` : `${base}${DOC}?mode=${GRAPH_MODE}`;
const OUT = path.join(SHOTS, 'x-header');
const NAME = (URI ? URI.replace(/^https?:\/\//, '') : DOC).replace(/^\/|[\/#]+$/g, '').replace(/[\/#.]+/g, '-');
await fs.mkdir(OUT, { recursive: true });

const downscale = (src, dst) => new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=1500:500:flags=lanczos', dst], { stdio: 'inherit' });
  p.on('close', (code) => (code ? rej(new Error(`ffmpeg exited ${code}`)) : res()));
});

await runScene({
  id: 'x-header', target: TARGET, warm: TARGET, identity,
  geometry: { width: 3000, height: 1000, deviceScaleFactor: 1 },
  async body({ page }) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await load(page, TARGET, 'canvas', 3000);
    await page.locator('button.graph-3d-fullscreen').first().click();
    await until(page.waitForFunction(() => !!document.querySelector('.graph-3d-maximized'), null, { timeout: 10_000 }), 'the graph maximised');
    await page.addStyleTag({ content: `
      .graph-3d-show-panel, .graph-3d-info-panel, .graph-3d-tooltip,
      .graph-3d-zoom, .graph-3d-fullscreen, .scene-nav-info { display: none !important; }
      .graph-3d-canvas.graph-3d-maximized { height: 100vh !important; }
      #__ldh-cursor { visibility: hidden !important; }` });
    // let the force layout settle before anything is framed
    await sleep(12_000);

    const setup = await page.evaluate(([labels, scale]) => {
      const entries = Object.entries(window.LinkedDataHub?.graphs ?? {});
      const live = entries.filter(([id]) => document.getElementById(id)?.closest('.graph-3d-maximized')).at(-1) ?? entries.at(-1);
      if (!live) return { ok: false };
      const fg = live[1].instance ?? live[1];
      window.__fg = fg;
      fg.width(innerWidth).height(innerHeight).backgroundColor(getComputedStyle(document.body).backgroundColor);
      // A node's label sits in the node's group beside its mesh; a link's label is the link's own object.
      // Only the words stay: a node labelled with a full URI (a term the vocabulary merely points at)
      // and every link label go.
      // The app draws node labels 5 high and link labels 4 (client/graph3d.xsl), which tells them apart.
      window.__labels = () => fg.scene().traverse((o) => {
        if (!o.isSprite) return;
        o.userData.h0 ??= o.textHeight;
        const onNode = o.userData.h0 >= 5;
        if (!labels || !onNode || /^https?:/.test(o.text ?? '')) { o.visible = false; return; }
        if (scale !== 1 && !o.userData.scaled) { o.textHeight = o.userData.h0 * scale; o.userData.scaled = true; }
        // drawn over the spheres: enlarged, a label would otherwise sink into its own node
        o.material.depthTest = false; o.renderOrder = 999;
      });
      window.__labels();
      fg.zoomToFit(0, 40);
      const box = fg.getGraphBbox();
      const c = { x: (box.x[0] + box.x[1]) / 2, y: (box.y[0] + box.y[1]) / 2, z: (box.z[0] + box.z[1]) / 2 };
      const cam = fg.cameraPosition();
      window.__orbit = { c, r: Math.hypot(cam.x - c.x, cam.z - c.z), a0: Math.atan2(cam.x - c.x, cam.z - c.z), y: cam.y };
      // the longest axis: the principal component of the node positions, by power iteration
      const ns = fg.graphData().nodes.filter((n) => Number.isFinite(n.x));
      const m = ns.reduce((acc, n) => ({ x: acc.x + n.x / ns.length, y: acc.y + n.y / ns.length, z: acc.z + n.z / ns.length }), { x: 0, y: 0, z: 0 });
      const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (const n of ns) { const d = [n.x - m.x, n.y - m.y, n.z - m.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j]; }
      let p = [1, 0.3, 0.2];
      for (let k = 0; k < 50; k++) { const q = cov.map((row) => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]); const l = Math.hypot(...q); p = q.map((v) => v / l); }
      window.__axis = { m, p };
      return { ok: true, nodes: fg.graphData().nodes.length, links: fg.graphData().links.length };
    }, [LABELS, LABEL_SCALE]);
    if (!setup.ok) throw new Error('no graph instance');
    console.log(`  ${URI ?? DOC}: ${setup.nodes} nodes, ${setup.links} links`);

    for (let deg = 0; deg < 360; deg += 30) {
      await page.evaluate(([d, labels, shift, zoom, align]) => {
        const { c, r, a0, y } = window.__orbit;
        const a = a0 + (d * Math.PI) / 180;
        if (align) {
          // a camera circling the axis p through the nodes' centroid, its up perpendicular to p, so p
          // lies across the frame; the aim slides along p to put the graph right of centre
          const { m, p } = window.__axis;
          const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          const norm = (u) => { const l = Math.hypot(...u); return u.map((x) => x / l); };
          const u = norm(cross(p, Math.abs(p[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
          const w = cross(p, u);
          const dir = [0, 1, 2].map((i) => Math.cos(a) * u[i] + Math.sin(a) * w[i]);
          const aim = { x: m.x + shift * r * p[0], y: m.y + shift * r * p[1], z: m.z + shift * r * p[2] };
          const up = norm(cross(p, dir));
          window.__fg.camera().up.set(up[0], up[1], up[2]);
          window.__fg.cameraPosition({ x: aim.x + zoom * r * dir[0], y: aim.y + zoom * r * dir[1], z: aim.z + zoom * r * dir[2] }, aim, 0);
          window.__labels();
          return;
        }
        // the camera's right in the orbit plane; aiming left of centre puts the graph right of it
        const aim = { x: c.x - shift * r * Math.cos(a), y: c.y, z: c.z + shift * r * Math.sin(a) };
        window.__fg.cameraPosition({ x: aim.x + zoom * r * Math.sin(a), y, z: aim.z + zoom * r * Math.cos(a) }, aim, 0);
        window.__labels();
      }, [deg, LABELS, SHIFT, ZOOM, ALIGN]);
      await sleep(700);
      const raw = path.join(OUT, `${NAME}-${String(deg).padStart(3, '0')}-3000.png`);
      await page.screenshot({ path: raw });
      await downscale(raw, path.join(OUT, `${NAME}-${String(deg).padStart(3, '0')}.png`));
      await fs.rm(raw);
    }
    console.log(`  stills: ${OUT}/${NAME}-*.png`);
  },
});
