// Shared bits for mock players: easing, timeline helpers, template loading and fills.
export const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const clamp = (t) => Math.max(0, Math.min(1, t));
export const at = (s, [a, b]) => clamp((s - a) / (b - a));
export const q = (s, r = document) => r.querySelector(s);
export const NS = 'http://www.w3.org/2000/svg';
export const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
export async function template(name) { const t = await (await fetch(`templates/${name}.html`)).text(); const d = document.createElement('div'); d.innerHTML = t; return d.firstElementChild; }
// Fill a captured form modal: rows by their label text; unmentioned rows are removed.
export function fillForm(modal, values, { title } = {}) {
  for (const g of [...modal.querySelectorAll('.ldh-prop-group')]) {
    const label = g.querySelector('.pred')?.textContent.trim();
    if (!(label in values)) { g.remove(); continue; }
    const v = values[label];
    const input = g.querySelector('input:not([type=hidden]), textarea');
    if (input) input.setAttribute('value', v); else { const val = g.querySelector('.cb-chip-lbl, .value'); if (val) val.textContent = v; }
  }
  if (title) { const t = modal.querySelector('.ac-modal-head h3, .ac-modal-head .ttl, legend'); if (t) t.textContent = title; }
  for (const sel of ['.ldh-form-subjbar', '.ldh-subject', '.ldh-prop-addrow', 'legend']) modal.querySelectorAll(sel).forEach((e) => e.remove());
  return modal;
}
