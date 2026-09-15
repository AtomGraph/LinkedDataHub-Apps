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
