// What a dataspace already contains — read this BEFORE writing a scenario.
//
// Scenes kept inventing questions the data already answers: 05-repeatable built
// "products per category", which is a chart on /categories/. The fix is not more
// care, it is looking first — so this prints the dataspace's existing answers, the
// shape of its data, and the questions it does NOT yet answer.
//
//   node inventory.mjs --base https://northwind-traders.demo.localhost

import { args } from './lib/harness.mjs';

// Both stacks serve self-signed certificates, and this reads nothing but public
// SPARQL results.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { base } = args();
const endpoint = `${base.replace(/\/$/, '')}/sparql`;

// Every query is cache-busted: the endpoint caches per query string, which silently
// served me a stale answer earlier in this work.
const ask = async (q) => {
  const url = new URL(endpoint);
  url.searchParams.set('query', `${q}\n# ${Date.now()}`);
  const r = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
  if (!r.ok) throw new Error(`${r.status} on ${q.slice(0, 40)}`);
  return (await r.json()).results.bindings;
};

const PREFIX = `PREFIX dct: <http://purl.org/dc/terms/>
PREFIX ldh: <https://w3id.org/atomgraph/linkeddatahub#>
PREFIX sp: <http://spinrdf.org/sp#>
PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>`;

const section = (t) => console.log(`\n── ${t}`);
const local = (u) => u.split(/[#/]/).filter(Boolean).pop();

section('documents');
for (const b of await ask(`${PREFIX}
SELECT ?doc ?title WHERE { GRAPH ?doc { ?doc dct:title ?title ; a ?t } }
ORDER BY ?doc`)) {
  const path = b.doc.value.replace(base, '') || '/';
  if (path.split('/').filter(Boolean).length <= 1) console.log(`  ${path.padEnd(22)} ${b.title.value}`);
}

section('questions the dataspace already answers (charts)');
for (const b of await ask(`${PREFIX}
SELECT DISTINCT ?title WHERE { GRAPH ?g { ?s a ldh:ResultSetChart ; dct:title ?title } } ORDER BY ?title`)) {
  console.log(`  ${b.title.value}`);
}

section('views');
for (const b of await ask(`${PREFIX}
SELECT DISTINCT ?title WHERE { GRAPH ?g { ?s a ldh:View ; dct:title ?title } } ORDER BY ?title`)) {
  console.log(`  ${b.title.value}`);
}

section('saved queries');
for (const b of await ask(`${PREFIX}
SELECT DISTINCT ?title WHERE { GRAPH ?g { ?s a sp:Select ; dct:title ?title } } ORDER BY ?title`)) {
  console.log(`  ${b.title.value}`);
}

section('classes, by instance count');
for (const b of await ask(`${PREFIX}
SELECT ?type (COUNT(DISTINCT ?s) AS ?n) WHERE { GRAPH ?g { ?s a ?type } }
GROUP BY ?type HAVING (COUNT(DISTINCT ?s) > 2) ORDER BY DESC(?n)`)) {
  console.log(`  ${String(b.n.value).padStart(7)}  ${local(b.type.value)}`);
}

section('external services declared');
const svc = await ask(`${PREFIX}
SELECT ?title ?endpoint WHERE { GRAPH ?g { ?s a sd:Service ; sd:endpoint ?endpoint . OPTIONAL { ?s dct:title ?title } } }`);
console.log(svc.length ? svc.map((b) => `  ${(b.title?.value ?? '(untitled)').padEnd(34)} ${b.endpoint.value}`).join('\n') : '  (none)');

console.log(`\n  A scenario must ask something NOT in the chart list above.`);
console.log(`  Test the question returns rows before scripting it — "products never`);
console.log(`  ordered" looked like a gap and answers 0.\n`);
