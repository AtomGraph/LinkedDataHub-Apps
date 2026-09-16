// Resetting the document a scene writes into.
//
// An accumulating scene builds a page up block by block, so it has to start from an
// empty one or take two films take one's leftovers. The reset runs through the ldh
// CLI *before* the browser context exists — the recording starts with the context,
// so setup is genuinely off camera rather than trimmed out afterwards.
//
// The CLI's location is a parameter like everything else: --ldh, or LDH_BIN, or
// whatever `ldh` resolves to on PATH.

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

function run(cmd, args, input = null) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args);
    if (input !== null) { p.stdin.write(input); p.stdin.end(); }
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => resolve({ code: -1, out, err: e.message }));
    p.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
  });
}

export async function resetDocument({ ldh, base, certFile, certPassword, certPasswordFile, container, slug, title }) {
  const password = certPassword ?? (certPasswordFile ? (await fs.readFile(certPasswordFile, 'utf8')).trim() : null);
  if (!password) throw new Error('resetDocument needs --cert-password or --cert-password-file');

  // The CLI takes its options after the subcommand, not before it.
  const auth = ['-b', base.endsWith('/') ? base : `${base}/`, '-f', certFile, '-p', password];
  const url = `${container.replace(/\/$/, '')}/${slug}/`;
  const scrub = (t) => String(t).split(password).join('••••');

  // Delete first; a missing document is not an error worth stopping for.
  const gone = await run(ldh, ['delete', url, ...auth]);
  const made = await run(ldh, ['create', 'item', ...auth, '--container', container, '--title', title, '--slug', slug]);

  if (made.code !== 0) {
    throw new Error(`could not create ${url}: ${scrub(made.err || made.out).slice(0, 400)}`);
  }
  return { url: made.out || url, deleted: gone.code === 0 };
}

// The scratch container a docs shot writes into.
//
// Shots that document an ACT of authoring — annotating a word, uploading a file,
// creating a resource — have to write somewhere, and writing into the demo data is
// not on: the demo is the showcase, and anything left behind becomes somebody's
// puzzle later. So a run provisions its own container, uses it, and removes it.
//
// Reset rather than create: delete first, so a run that died before teardown does
// not poison the next one. Nothing here assumes a document that some earlier session
// happened to leave lying around.
export async function resetContainer({ ldh, base, certFile, certPassword, certPasswordFile, parent, slug, title }) {
  const password = certPassword ?? (certPasswordFile ? (await fs.readFile(certPasswordFile, 'utf8')).trim() : null);
  if (!password) throw new Error('resetContainer needs --cert-password or --cert-password-file');

  const root = base.endsWith('/') ? base : `${base}/`;
  const auth = ['-b', root, '-f', certFile, '-p', password];
  const scrub = (t) => String(t).split(password).join('••••');

  await run(ldh, ['delete', `${(parent ?? root).replace(/\/$/, '')}/${slug}/`, ...auth.slice(2)]);
  const made = await run(ldh, ['create', 'container', ...auth, '--parent', parent ?? root, '--title', title, '--slug', slug]);
  if (made.code !== 0) throw new Error(`could not create container ${slug}: ${scrub(made.err || made.out).slice(0, 400)}`);
  return made.out || `${root}${slug}/`;
}

// Remove what a run created: the documents it made, then the container itself. A shot
// that creates through the UI declares the slugs it will leave behind, because the
// runner cannot see them otherwise.
export async function removeAll({ ldh, certFile, certPassword, certPasswordFile, urls }) {
  const password = certPassword ?? (certPasswordFile ? (await fs.readFile(certPasswordFile, 'utf8')).trim() : null);
  const auth = ['-f', certFile, '-p', password];
  const gone = [];
  for (const url of urls) {
    const r = await run(ldh, ['delete', url, ...auth]);
    gone.push([url, r.code === 0]);
  }
  return gone;
}

// Removing last take's write-up document, off camera, when its path is not known.
//
// A document created on camera through Create ▸ Item lands at a UUID path, so there
// is no slug to reset by. The title is stable, so the previous take's document is
// found by it and deleted before the browser context exists — the same off-camera
// discipline as resetDocument, keyed differently. Exact title match, scoped to this
// base; the store is shared across dataspaces.
export async function deleteByTitle({ ldh, base, certFile, certPassword, certPasswordFile, title }) {
  const root = base.endsWith('/') ? base : `${base}/`;
  const endpoint = `${root}sparql`;
  const q = `PREFIX dct: <http://purl.org/dc/terms/>
SELECT DISTINCT ?doc WHERE { GRAPH ?doc { ?s dct:title ${JSON.stringify(title)} } FILTER(STRSTARTS(STR(?doc), ${JSON.stringify(root)})) }
# ${Date.now()}`;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  let urls = [];
  try {
    const u = new URL(endpoint); u.searchParams.set('query', q);
    const r = await fetch(u, { headers: { Accept: 'application/sparql-results+json' } });
    if (r.ok) urls = (await r.json()).results.bindings.map((b) => b.doc.value);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
  if (!urls.length) return { removed: [] };
  const gone = await removeAll({ ldh, certFile, certPassword, certPasswordFile, urls });
  return { removed: gone.filter(([, ok]) => ok).map(([u]) => u), failed: gone.filter(([, ok]) => !ok).map(([u]) => u) };
}

// Stripping last take's content blocks off an EXISTING document, off camera.
//
// A scene that documents a record the demo already has — a product page — writes
// its blocks onto that page, and the next take must start from the bare page again.
// The document itself stays: only the ldh:XHTML / ldh:Object blocks and the rdf:_N
// slots that hold them go, through the document's own PATCH.
export async function clearBlocks({ ldh, certFile, certPassword, certPasswordFile, url }) {
  const password = certPassword ?? (certPasswordFile ? (await fs.readFile(certPasswordFile, 'utf8')).trim() : null);
  if (!password) throw new Error('clearBlocks needs --cert-password or --cert-password-file');
  const update = `PREFIX ldh: <https://w3id.org/atomgraph/linkeddatahub#>
DELETE { <${url}> ?slot ?block . ?block ?p ?o }
WHERE { <${url}> ?slot ?block . ?block a ?type . FILTER(?type IN (ldh:XHTML, ldh:Object)) FILTER(STRSTARTS(STR(?slot), "http://www.w3.org/1999/02/22-rdf-syntax-ns#_")) ?block ?p ?o }`;
  const r = await run(ldh, ['patch', url, '-f', certFile, '-p', password], update);
  return { ok: r.code === 0, out: String(r.err || r.out).split(password).join('••••').slice(0, 300) };
}
