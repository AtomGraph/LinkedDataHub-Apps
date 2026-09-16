// Driving the 3D graph.
//
// Nodes are WebGL, not DOM, so there is nothing to locate: their positions come from
// the ForceGraph3D instance the app keeps at LinkedDataHub.graphs[<canvas id>],
// nested one level down under .instance. graph2ScreenCoords() gives canvas-relative
// coordinates; the canvas offset makes them page coordinates.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// forwards the argument — dropping it made every parameterised probe destructure
// undefined, which reads as "undefined is not iterable" from inside the page
const read = (page, fn, arg) => page.evaluate(fn, arg);

export async function graphState(page) {
  return read(page, () => {
    const g = Object.values(window.LinkedDataHub?.graphs ?? {})[0];
    if (!g) return null;
    const fg = g.instance ?? g;
    const d = fg.graphData();
    return { nodes: d.nodes.length, links: d.links.length, loaded: (g['loaded-uris'] || []).length };
  });
}

// A node belonging to another document — expanding one of those is what crosses the
// document boundary, which is the whole point of the gesture.
export async function foreignNode(page, documentUri, { skip = 0, prefer = null } = {}) {
  return read(page, ([here, n, preferSrc]) => {
    const g = Object.values(window.LinkedDataHub?.graphs ?? {})[0];
    if (!g) return { error: 'no graph instance' };
    const fg = g.instance ?? g;
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return { error: 'no canvas' };
    const canvas = canvasEl.getBoundingClientRect();
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
      .filter(({ p }) => p.x > 120 && p.x < canvas.width - 120 && p.y > 80 && p.y < canvas.height - 80);
    const preferred = want ? reachable.filter(({ x }) => want.test(String(x.id))) : [];
    const foreign = preferred.length ? preferred : reachable;
    const hit = foreign[n];
    if (!hit) return { error: `no reachable foreign node (${foreign.length} candidates)` };
    return {
      id: String(hit.x.id),
      x: Math.round(canvas.x + hit.p.x),
      y: Math.round(canvas.y + hit.p.y),
      of: foreign.length,
      preferred: preferred.length,
    };
  }, [documentUri, skip, prefer ? prefer.source ?? String(prefer) : null]);
}

// Expanding a node.
//
// A bare dblclick does not register: the canvas wants the pointer settled on the node
// first, so this clicks once to focus and then double-clicks with a delay between the
// presses. `loaded-uris` is the honest confirmation — node counts move on their own
// while the force layout settles.
export async function expand(page, cursor, node, { settle = 6000 } = {}) {
  const before = await graphState(page);
  // Short travel: every millisecond between reading the coordinate and pressing is a
  // millisecond the simulation moves the node out from under the pointer.
  await cursor.moveTo(node.x, node.y, { duration: 360 });
  await sleep(260);
  await page.mouse.click(node.x, node.y);
  await sleep(600);
  await page.mouse.dblclick(node.x, node.y, { delay: 90 });
  await sleep(settle);
  const after = await graphState(page);
  return {
    ok: after.loaded > before.loaded,
    gained: after.nodes - before.nodes,
    links: after.links - before.links,
    before, after,
  };
}

export async function zoomToFit(page, cursor) {
  const fit = page.locator('button, .ac-btn').filter({ hasText: /Zoom to fit/i }).first();
  if (!(await fit.count())) return false;
  await cursor.click(fit);
  await sleep(2200);
  return true;
}
