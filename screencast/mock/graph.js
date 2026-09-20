// A drawn graph, in the app's idiom: hue-per-type nodes (hsl(h,70%,60%)) on #000011,
// thin light links, labels on the bigger nodes. Laid out with d3-force off-screen,
// then animated by the player: nodes appear, links draw, a second document's nodes
// arrive along the links that reach them.
import { svgEl } from './lib.js';
export function hueOf(type) { let s = 0; for (const c of `https://schema.org/${type}`) s += c.codePointAt(0); return s % 360; }
export function layout(nodes, links, { w, h, iterations = 300, charge = -260, dist = 60 } = {}) {
  const sim = d3.forceSimulation(nodes).force('link', d3.forceLink(links).id((d) => d.id).distance((l) => l.dist ?? dist)).force('charge', d3.forceManyBody().strength(charge)).force('center', d3.forceCenter(w / 2, h / 2)).force('collide', d3.forceCollide(16)).stop();
  for (let i = 0; i < iterations; i++) sim.tick();
  return { nodes, links };
}
export function draw(svg, nodes, links) {
  const gl = svgEl('g', { class: 'links' }), gn = svgEl('g', { class: 'nodes' });
  svg.append(gl, gn);
  const L = links.map((l) => { const e = svgEl('line', { x1: l.source.x, y1: l.source.y, x2: l.target.x, y2: l.target.y, stroke: 'rgba(255,255,255,.28)', 'stroke-width': 1.2 }); gl.append(e); l.el = e; return e; });
  const N = nodes.map((n) => { const g = svgEl('g', { transform: `translate(${n.x},${n.y})` }); const c = svgEl('circle', { r: 0, fill: `hsl(${n.hue}, 70%, 60%)` }); g.append(c); if (n.label && n.big) { const t = svgEl('text', { x: 0, y: -(n.r + 7), 'text-anchor': 'middle', fill: 'rgba(255,255,255,.85)', 'font-size': 12, 'font-family': 'Geist, system-ui, sans-serif', opacity: 0 }); t.textContent = n.label; g.append(t); n.text = t; } gn.append(g); n.el = g; n.circle = c; return g; });
  return { L, N };
}
