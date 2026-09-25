// Writes the published shots into the docs' .ttl sources, and rewrites them in place
// when they are re-shot.
//
// The shoot writes masters and an index; `make docs-publish` derives the web assets and
// their content-addressed names. This is the step that makes a document point at one:
// it reads the index, hashes the PUBLISHED file (never the master — the hash is the
// address, and only the shipped bytes have the right one), and replaces the slot.
//
// Idempotent, because a re-shoot changes every hash it touches and there is no
// placeholder left to find the second time. The caption is the key: it arrives in the
// markup as @alt / @aria-label and stays there, so a slot is located either by its
// placeholder div or by the element already carrying its caption. Nothing else in the
// document is read or written, and a blocked slot — one the manifest says cannot be
// shot — is never touched.
//
//   node docs/fill.mjs [--dry]

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const DOCS = path.resolve(HERE, '../../docs');
const dry = process.argv.includes('--dry');

const sha1 = async (file) => createHash('sha1').update(await fs.readFile(file)).digest('hex');
const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The published file for a shot: a still is optimised to WebP, a clip ships as the mp4
// the pacer already produced.
const publishedFor = (record) => {
  const rel = record.file.replace(/^docs\/out\//, '');
  return rel.endsWith('.png') ? rel.replace(/\.png$/, '.webp') : rel;
};

const elementFor = (kind, label, src) =>
  kind === 'still'
    ? `<img alt="${escapeAttr(label)}" src="${src}"></img>`
    : `<video aria-label="${escapeAttr(label)}" controls="controls" preload="metadata" src="${src}"></video>`;

const PLACEHOLDER = /^([ \t]*)<div class="screenshot-placeholder">\n[\s\S]*?^\1<\/div>\n/gm;

const index = JSON.parse(await fs.readFile(path.join(OUT, 'index.json'), 'utf8'));
const edits = new Map();
const report = { filled: 0, rewritten: 0, unchanged: 0, missing: [] };

for (const shot of index) {
  if (shot.outcome !== 'ok') continue;

  const published = publishedFor(shot);
  const file = path.join(DOCS, published);
  let digest;
  try {
    digest = await sha1(file);
  } catch {
    report.missing.push(`${shot.doc} #${shot.n} — ${published} is not published; run make docs-publish`);
    continue;
  }

  const ttl = path.join(DOCS, `${shot.doc}.ttl`);
  const text = edits.get(ttl) ?? await fs.readFile(ttl, 'utf8');
  const label = shot.caption.charAt(0).toUpperCase() + shot.caption.slice(1);
  // One `../` per path segment of the page, so the reference resolves to {base}uploads/
  // from the document itself — LDH emits no <base href>, and the static build carries
  // the same prefix through to files/.
  const src = '../'.repeat(shot.doc.split('/').length) + `uploads/${digest}`;
  const element = elementFor(shot.kind, label, src);

  // Already filled: rewrite the element carrying this caption, hash and all.
  const existing = new RegExp(
    `<(?:img|video)\\s[^>]*(?:alt|aria-label)="${escapeRe(escapeAttr(label))}"[^>]*>(?:</(?:img|video)>)?`,
  );
  if (existing.test(text)) {
    const before = text.match(existing)[0];
    if (before === element) { report.unchanged++; continue; }
    edits.set(ttl, text.replace(existing, element));
    report.rewritten++;
    console.log(`  ~ ${shot.doc} #${shot.n}  → ${digest.slice(0, 12)}…`);
    continue;
  }

  // Not filled yet: find the placeholder whose caption this is.
  //
  // Compared as TEXT: a caption may carry inline markup — reference/administration
  // /ontologies names its controls in <samp> — and the manifest's caption is the plain
  // sentence, which is also what becomes @alt. Comparing the raw content would never
  // match those, and putting the markup in the manifest would put escaped tags in the
  // attribute. Captions without markup compare exactly as before.
  const plain = (x) => x.replace(/<[^>]+>/g, '');
  let hit = null;
  for (const m of text.matchAll(PLACEHOLDER)) {
    const caption = /<p>([\s\S]*?)<\/p>/.exec(m[0]);
    if (caption && plain(caption[1]).split(': ').slice(1).join(': ').trim() === shot.caption) { hit = m; break; }
  }
  if (!hit) {
    report.missing.push(`${shot.doc} #${shot.n} — no placeholder and no element for "${shot.caption.slice(0, 60)}"`);
    continue;
  }
  edits.set(ttl, text.slice(0, hit.index) + hit[1] + element + '\n' + text.slice(hit.index + hit[0].length));
  report.filled++;
  console.log(`  + ${shot.doc} #${shot.n}  → ${digest.slice(0, 12)}…`);
}

if (!dry) for (const [file, text] of edits) await fs.writeFile(file, text);

console.log(
  `\n${report.filled} filled, ${report.rewritten} rewritten, ${report.unchanged} unchanged, ` +
  `${edits.size} file(s) ${dry ? 'would change' : 'written'}`,
);
for (const m of report.missing) console.log(`  ! ${m}`);
process.exit(report.missing.length ? 1 : 0);
