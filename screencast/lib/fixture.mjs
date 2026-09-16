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

function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args);
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
