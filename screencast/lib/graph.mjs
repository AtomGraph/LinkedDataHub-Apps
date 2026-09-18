// Driving the 3D graph.
//
// Nodes are WebGL, not DOM, so there is nothing to locate: their positions come from
// the ForceGraph3D instance the app keeps at LinkedDataHub.graphs[<canvas id>],
// nested one level down under .instance. graph2ScreenCoords() gives canvas-relative
// UNZOOMED pixels; under a CSS zoom on the document (the 2× takes) the canvas rect is
// in zoomed viewport pixels, so a screen point is rect.x + p.x × zoom.
// coordinates; the canvas offset makes them page coordinates.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// forwards the argument — dropping it made every parameterised probe destructure
// undefined, which reads as "undefined is not iterable" from inside the page
const read = (page, fn, arg) => page.evaluate(fn, arg);

export async function graphState(page) {
  return read(page, () => {
    const g = (() => {
      // The LIVE instance, not the first one registered. LinkedDataHub.graphs is keyed
      // by canvas id and accumulates across in-app navigation, so after a scene leaves
      // a graph and comes back to one, [0] is the dead canvas from the opening — stale
      // coordinates, and a double-click that lands on nothing. Pick the entry whose
      // canvas is in the DOM and visible; fall back to the newest.
      const gs = window.LinkedDataHub?.graphs ?? {};
      const entries = Object.entries(gs);
      const live = entries.filter(([id]) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; });
      const pick = (live.length ? live : entries).at(-1);
      return pick ? pick[1] : undefined;
    })();
    if (!g) return null;
    const fg = g.instance ?? g;
    const d = fg.graphData();
    return { nodes: d.nodes.length, links: d.links.length, loaded: (g['loaded-uris'] || []).length, uris: [...(g['loaded-uris'] || [])].map(String) };
  });
}

// A node belonging to another document — expanding one of those is what crosses the
// document boundary, which is the whole point of the gesture.
export async function foreignNode(page, documentUri, { skip = 0, prefer = null } = {}) {
  return read(page, ([here, n, preferSrc]) => {
    const g = (() => {
      // The LIVE instance, not the first one registered. LinkedDataHub.graphs is keyed
      // by canvas id and accumulates across in-app navigation, so after a scene leaves
      // a graph and comes back to one, [0] is the dead canvas from the opening — stale
      // coordinates, and a double-click that lands on nothing. Pick the entry whose
      // canvas is in the DOM and visible; fall back to the newest.
      const gs = window.LinkedDataHub?.graphs ?? {};
      const entries = Object.entries(gs);
      const live = entries.filter(([id]) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; });
      const pick = (live.length ? live : entries).at(-1);
      return pick ? pick[1] : undefined;
    })();
    if (!g) return { error: 'no graph instance' };
    const fg = g.instance ?? g;
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return { error: 'no canvas' };
    const canvas = canvasEl.getBoundingClientRect();
    const z = (() => { const v = Number(getComputedStyle(document.documentElement).zoom); return Number.isFinite(v) && v > 0 ? v : 1; })();
    const raw = g['loaded-uris'];
    const loaded = new Set(Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.keys(raw) : []));
    // A document's graph carries more than its subject: the container's own saved
    // queries turn up as nodes too, and expanding one of those registers but adds
    // nothing. `prefer` names the URIs worth opening — the parties to the order
    // rather than the machinery around it.
    const want = preferSrc ? new RegExp(preferSrc) : null;
    const reachable = fg.graphData().nodes
      .filter((x) => String(x.id).startsWith('http') && !String(x.id).startsWith(here) && !loaded.has(String(x.id)))
      // nodes near the middle of the canvas are the ones a pointer can actually reach
      .map((x) => ({ x, p: fg.graph2ScreenCoords(x.x, x.y, x.z) }))
      .filter(({ p }) => p.x > 120 && p.x < canvas.width / z - 120 && p.y > 80 && p.y < canvas.height / z - 80);
    const preferred = want ? reachable.filter(({ x }) => want.test(String(x.id))) : [];
    const foreign = preferred.length ? preferred : reachable;
    const hit = foreign[n];
    if (!hit) return { error: `no reachable foreign node (${foreign.length} candidates)` };
    return {
      id: String(hit.x.id),
      x: Math.round(canvas.x + hit.p.x * z),
      y: Math.round(canvas.y + hit.p.y * z),
      of: foreign.length,
      preferred: preferred.length,
    };
  }, [documentUri, skip, prefer ? prefer.source ?? String(prefer) : null]);
}

// Where a named node is on screen right now.
//
// foreignNode() returns the nodes NOT yet described — the stubs worth expanding. This
// is the other half: once a node's document has been pulled in, its coordinates have
// moved and it has to be found again by URI rather than by the position it used to be
// at.
export async function nodeById(page, uri) {
  return read(page, ([wanted]) => {
    const g = (() => {
      // The LIVE instance, not the first one registered. LinkedDataHub.graphs is keyed
      // by canvas id and accumulates across in-app navigation, so after a scene leaves
      // a graph and comes back to one, [0] is the dead canvas from the opening — stale
      // coordinates, and a double-click that lands on nothing. Pick the entry whose
      // canvas is in the DOM and visible; fall back to the newest.
      const gs = window.LinkedDataHub?.graphs ?? {};
      const entries = Object.entries(gs);
      const live = entries.filter(([id]) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; });
      const pick = (live.length ? live : entries).at(-1);
      return pick ? pick[1] : undefined;
    })();
    if (!g) return { error: 'no graph instance' };
    const fg = g.instance ?? g;
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return { error: 'no canvas' };
    const canvas = canvasEl.getBoundingClientRect();
    const z = (() => { const v = Number(getComputedStyle(document.documentElement).zoom); return Number.isFinite(v) && v > 0 ? v : 1; })();
    const hit = fg.graphData().nodes.find((x) => String(x.id) === wanted);
    if (!hit) return { error: `no node ${wanted}` };
    const p = fg.graph2ScreenCoords(hit.x, hit.y, hit.z);
    if (p.x < 120 || p.x > canvas.width / z - 120 || p.y < 80 || p.y > canvas.height / z - 80) {
      return { error: 'node is off the reachable part of the canvas' };
    }
    return { id: wanted, x: Math.round(canvas.x + p.x * z), y: Math.round(canvas.y + p.y * z) };
  }, [uri]);
}

// Selecting a node — the gesture the graph answers with a description rather than
// with more graph.
//
// The three node gestures are distinct and all three are real: a single click renders
// the node's description into #info-content-<canvas-id>, a double click expands
// forward along its properties, and a right click expands backwards along what points
// at it (client/graph3d.xsl). The description the single click writes carries the
// node's URI as an ordinary `<a href target="_blank">`, which is the route out of the
// canvas and into the document — so the graph is not a dead end, and a scene does not
// have to leave graph mode to prove it.
//
// The anchor appears only when the node HAS a description in the loaded graph: the
// click handler falls back to rendering the bare label for a node that is still a
// stub, and that fallback emits no link. So select() is a gesture for a node whose
// document has already been pulled in — expand it first, then select it.
//
// Same short travel as expand(): every millisecond between reading the coordinate and
// pressing is a millisecond the force simulation moves the node out from under the
// pointer.
export async function select(page, cursor, node, { settle = 1800, tries = 3 } = {}) {
  // After an expansion the force layout keeps moving for seconds — the bigger the
  // document pulled in, the longer — and a click aimed at where the node WAS lands on
  // empty canvas, leaving the panel showing the stub label from the focus click
  // before it. So the node is re-read until it holds still, then clicked, and the
  // panel is checked for THIS node's link; a miss is aimed again, not reported.
  const link = page.locator('[id^="info-content-"] a[href^="http"]').first();
  let at = node;
  for (let attempt = 0; attempt < tries; attempt++) {
    at = node.id ? await approach(page, cursor, node.id, { fallback: at }) : at;
    await cursor.moveTo(at.x, at.y, { duration: 360 });
    await sleep(200);
    at = await settledNode(page, node.id ?? at.id, at);
    await page.mouse.click(at.x, at.y);
    await sleep(settle);
    const href = await link.getAttribute('href', { timeout: 500 }).catch(() => null);
    if (href && (!node.id || href === node.id)) break;
    if (attempt === tries - 1) return { ok: false, why: href ? `the panel shows ${href}, not the node aimed at` : 'the click did not land on a described node' };
  }

  // Where to press. The anchor is inline inside a taller <dd>, so the centre of its
  // bounding box lands on the <dd>'s padding rather than on the link — Playwright's
  // hit-target check then refuses the click and the beat reports nothing happening
  // while the link sits right there. So a point is found that elementFromPoint really
  // resolves to the anchor, which is also the point a person would aim at.
  const point = await page.evaluate(() => {
    const a = document.querySelector('[id^="info-content-"] a[href^="http"]');
    if (!a) return null;
    for (const rect of a.getClientRects()) {
      for (const fx of [0.15, 0.3, 0.5]) {
        const x = Math.round(rect.left + rect.width * fx);
        const y = Math.round(rect.top + rect.height / 2);
        let e = document.elementFromPoint(x, y);
        while (e && e !== a) e = e.parentElement;
        if (e === a) return { x, y };
      }
    }
    return null;
  });

  return {
    ok: true,
    link,
    point,
    href: await link.getAttribute('href').catch(() => null),
  };
}

// Expanding a node.
//
// A bare dblclick does not register: the canvas wants the pointer settled on the node
// first, so this clicks once to focus and then double-clicks with a delay between the
// presses. `loaded-uris` is the honest confirmation — node counts move on their own
// while the force layout settles.
// Where the pointer must go to hit THIS node, and whether it can.
//
// The canvas is a 3D projection: a class node a few pixels off in 2D but nearer the
// camera takes the click meant for the node behind it — which is how a double-click
// on a customer once dereferenced schema:Order instead and pulled 97 nodes of
// schema.org into the graph. So the node is read together with every other node that
// projects within `radius` px and sits closer to the camera; when there is one, the
// caller zooms in until there is not.
export async function aim(page, uri, { radius = 14 } = {}) {
  return read(page, ([wanted, radius]) => {
    const gs = window.LinkedDataHub?.graphs ?? {};
    const entries = Object.entries(gs);
    const live = entries.filter(([id]) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; });
    const pick = (live.length ? live : entries).at(-1);
    const g = pick ? pick[1] : undefined;
    if (!g) return { error: 'no graph instance' };
    const fg = g.instance ?? g;
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return { error: 'no canvas' };
    const canvas = canvasEl.getBoundingClientRect();
    const z = (() => { const v = Number(getComputedStyle(document.documentElement).zoom); return Number.isFinite(v) && v > 0 ? v : 1; })();
    const nodes = fg.graphData().nodes;
    const hit = nodes.find((x) => String(x.id) === wanted);
    if (!hit) return { error: `no node ${wanted}` };
    const cam = fg.camera().position;
    const dist = (n) => Math.hypot(n.x - cam.x, n.y - cam.y, n.z - cam.z);
    const p = fg.graph2ScreenCoords(hit.x, hit.y, hit.z);
    const mine = dist(hit);
    const occluders = nodes.filter((n) => n !== hit).map((n) => ({ n, q: fg.graph2ScreenCoords(n.x, n.y, n.z) }))
      .filter(({ q }) => Math.hypot(q.x - p.x, q.y - p.y) <= radius)
      .filter(({ n }) => dist(n) < mine)
      .map(({ n }) => String(n.id));
    const off = p.x < 120 || p.x > canvas.width / z - 120 || p.y < 80 || p.y > canvas.height / z - 80;
    return { id: wanted, x: Math.round(canvas.x + p.x * z), y: Math.round(canvas.y + p.y * z), clear: occluders.length === 0 && !off, occluders, off };
  }, [uri, radius]);
}

// The pointer on the node — proven, not projected.
//
// The canvas says what is under the pointer: every hover dispatches
// ForceGraph3DNodeHoverOn with the node id (client/3d-force-graph.xsl), and the label
// sprites drawn above each node take hits the projection knows nothing about. So the
// pointer is moved to the node's projected point and the hovered id is read back; a
// miss tries a ring of nearby points, and when none of them is this node the view is
// turned a little by dragging — the gesture a person makes — and it starts over.
async function armHover(page) {
  await page.evaluate(() => {
    if (window.__ldhHoverArmed) return;
    window.__ldhHoverArmed = true;
    document.addEventListener('ForceGraph3DNodeHoverOn', (e) => { window.__ldhHover = e.detail?.nodeId ?? null; });
    document.addEventListener('ForceGraph3DNodeHoverOff', () => { window.__ldhHover = null; });
  });
}
const hovered = (page) => page.evaluate(() => window.__ldhHover ?? null);

export async function approach(page, cursor, uri, { turns = 3, fallback = null } = {}) {
  await armHover(page);
  let at = null;
  for (let turn = 0; turn <= turns; turn++) {
    at = await settledNode(page, uri, fallback);
    if (!at || at.error) return fallback ?? at;
    await cursor.moveTo(at.x, at.y, { duration: 360 });
    await sleep(320);
    if ((await hovered(page)) === uri) return { ...at, proven: true };
    const ring = [];
    for (const r of [4, 8, 12, 18]) for (let k = 0; k < 8; k++) ring.push([Math.round(r * Math.cos(k * Math.PI / 4)), Math.round(r * Math.sin(k * Math.PI / 4))]);
    for (const [dx, dy] of ring) {
      await page.mouse.move(at.x + dx, at.y + dy);
      await sleep(140);
      if ((await hovered(page)) === uri) {
        const point = { ...at, x: at.x + dx, y: at.y + dy, proven: true };
        await cursor.moveTo(point.x, point.y, { duration: 120 });
        return point;
      }
    }
    if (turn === turns) break;
    // Turn the view: drag on empty canvas, well away from the node.
    const canvas = await page.locator('canvas').first().boundingBox();
    const sx = canvas.x + canvas.width * 0.5, sy = canvas.y + canvas.height * 0.86;
    await cursor.moveTo(sx, sy, { duration: 300 });
    await page.mouse.down(); await page.mouse.move(sx + 90, sy - 30, { steps: 12 }); await page.mouse.up();
    await sleep(1600);
  }
  return { ...at, proven: false };
}

// The node's screen position once it has stopped drifting (two reads 250 ms apart
// within a pixel), or the latest read after ~8 s of trying.
async function settledNode(page, uri, fallback) {
  if (!uri) return fallback;
  let last = null;
  for (let i = 0; i < 32; i++) {
    const now = await nodeById(page, uri);
    if (now.error) return last ?? fallback;
    if (last && Math.abs(now.x - last.x) <= 1 && Math.abs(now.y - last.y) <= 1) return now;
    last = now;
    await sleep(250);
  }
  return last ?? fallback;
}

export async function expand(page, cursor, node, { settle = 6000 } = {}) {
  const before = await graphState(page);
  const at = node.id ? await approach(page, cursor, node.id, { fallback: node }) : node;
  if (at.error) return { ok: false, why: at.error, gained: 0, links: 0, before, after: before };
  if (at.proven === false) return { ok: false, why: 'could not get the pointer onto the node', gained: 0, links: 0, before, after: before };
  // Short travel: every millisecond between reading the coordinate and pressing is a
  // millisecond the simulation moves the node out from under the pointer.
  await cursor.moveTo(at.x, at.y, { duration: 360 });
  await sleep(260);
  await page.mouse.click(at.x, at.y);
  await sleep(600);
  await page.mouse.dblclick(at.x, at.y, { delay: 90 });
  await sleep(settle);
  const after = await graphState(page);
  const wanted = node.id ? String(node.id).replace(/#.*$/, '') : null;
  const loadedIt = !wanted || (after.uris ?? []).some((u) => String(u).startsWith(wanted));
  return {
    ok: after.loaded > before.loaded && loadedIt,
    loadedOther: after.loaded > before.loaded && !loadedIt,
    gained: after.nodes - before.nodes,
    links: after.links - before.links,
    before, after,
  };
}

export async function zoomToFit(page, cursor) {
  // the maximised canvas's own button when there is one; the drawn cursor clicks it,
  // but a click that cannot land in a moment (a fixed container the page cannot scroll)
  // gives way to the graph's own zoomToFit so a take never hangs here
  const scope = (await page.locator('.graph-3d-maximized').count()) ? page.locator('.graph-3d-maximized') : page;
  const fit = scope.locator('button, .ac-btn').filter({ hasText: /Zoom to fit/i }).filter({ visible: true }).first();
  if (!(await fit.count())) return false;
  const box = await fit.boundingBox({ timeout: 3000 }).catch(() => null);
  if (box) {
    await cursor.moveTo(box.x + box.width / 2, box.y + box.height / 2, { duration: 400 });
    const clicked = await fit.click({ timeout: 5000 }).then(() => true, () => false);
    if (clicked) { await sleep(2200); return true; }
  }
  await page.evaluate(() => { const gs = window.LinkedDataHub?.graphs ?? {}; for (const g of Object.values(gs)) { try { (g.instance ?? g).zoomToFit(400); } catch {} } });
  await sleep(2200);
  return true;
}
