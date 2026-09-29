// A scene's inputs, resolved from the data it is about to film.
//
// Which order is late, which region is the thin one, which document a name lives in:
// a scene reads these from the endpoint before the browser exists rather than carrying
// them as constants that go stale the next time the dataset changes. Read-only; the
// same cache-busted request inventory.mjs makes.
export async function select(base, query) {
  const endpoint = `${base.replace(/\/$/, '')}/sparql`;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    const u = new URL(endpoint);
    u.searchParams.set('query', `${query}\n# ${Date.now()}`);
    const r = await fetch(u, { headers: { Accept: 'application/sparql-results+json' } });
    if (!r.ok) throw new Error(`${r.status} from ${endpoint}`);
    return (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}
