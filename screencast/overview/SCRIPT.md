# LinkedDataHub overview — narration script (draft)

The flagship film: every feature `docs/about.ttl` lists, in three chapters, narrated with an
ElevenLabs voice. It fills the About page's "Screen recording: LinkedDataHub overview" slot
and replaces "What's new in LinkedDataHub v3?" on YouTube.

The voice sets the timing. Each line is synthesised on its own, and its shot holds for the
line's length plus a short pause — the picture is cut to the voice, never the other way round.
Target ≈ 600 words, 4–5 minutes.

Captions become an `.srt` generated from these lines; only chapter titles are burned in.

## Intro

| # | On screen | Narration |
|---|---|---|
| 0.1 | Graph mode on a document, nodes settling | LinkedDataHub is an open-source platform for Knowledge Graphs. Everything you see here — the documents, the forms, the charts, even the rules for who may read them — is RDF data, served through one HTTP API. |

## Chapter 1 — Knowledge management

| # | On screen | Narration |
|---|---|---|
| 1.1 | The drawer opens on the document tree; a container is opened | A dataspace is a tree of documents. Each document is a named graph, with a URL you can open, bookmark or link to. |
| 1.2 | One view cycled through list, table, grid, map, chart | A container's contents are the results of a SPARQL query, and the same results can be laid out as a list, a table, a grid, a map or a chart. |
| 1.3 | Graph mode: a node double-clicked, the graph grows, a node opened | In graph mode, documents are nodes and links are edges. Opening a node follows the link into another document. |
| 1.4 | The pivot bar: results re-centre on a related class | Related results follow a property from one set of results to the next. |
| 1.5 | The search dialog: a label typed, typed results | Search finds resources by their labels, across the whole dataspace. |
| 1.6 | A SELECT typed and saved; its results render; a chart is bound to it | A SPARQL query is saved as a document like any other. Its results render on the page, and a chart can be bound to it. |
| 1.7 | Content mode: a prose block written, the chart embedded, a block dragged | Content mode turns a document into a page. Prose sits beside embedded resources — a chart, a map, a view — and dragging a block reorders the page. |
| 1.8 | A word selected, the annotation dialog, the word linked | Prose is edited in place. Select a word, link it to a resource, and the sentence carries a machine-readable statement. |
| 1.9 | A remote RDF document opened through the proxy, then forked | Linked Data from anywhere on the Web opens through the proxy, and can be forked into the dataspace in one step. |
| 1.10 | The CSV import form: file, mapping query, the imported container | A CSV file is imported by mapping each row to RDF with a SPARQL query. |
| 1.11 | A photo dropped on a document; then a Turtle file dropped | Dropping a file on a document uploads it. Dropping an RDF file imports it. |
| 1.12 | The History dialog, a version diff, a restore | With versioning enabled, every write becomes a version. The history shows who changed what, the diff shows how, and any version can be restored. |

## Chapter 2 — Low-code platform

| # | On screen | Narration |
|---|---|---|
| 2.1 | Create ▸ a class; the generated form filled and saved | Forms are generated from the model. A class's constructor decides which fields a new instance starts with, and Save writes the graph. |
| 2.2 | An empty required field submitted; the violation on the field | SHACL and SPIN constraints are checked on every write, and a violation is shown on the field that caused it. |
| 2.3 | A class's view on an instance page, re-reading after the save | Views declared on a class appear on every one of its instances, and pick up changes by themselves. |
| 2.4 | The sign-in screen: WebID, Google, ORCID | Agents sign in with a WebID certificate, or with Google or ORCID. |
| 2.5 | Terminal: `ldh admin make-public`; the page in a private window | Access is controlled by authorizations, which are documents too. One command makes a dataspace public. |
| 2.6 | The page switches dark to light, then narrows to phone width | The interface follows the reader's colour scheme and screen size, and a dataspace can override any part of it with its own stylesheet. |
| 2.7 | The dataspace menu; a second dataspace opened in a tab | One instance hosts many dataspaces, each with its own data, model and rules. |
| 2.8 | Terminal: `ldh push` a folder; the new dataspace in the browser | The command line uses the same HTTP API as the interface. Push a folder of Turtle files, and it becomes a dataspace — documents, model and all. |

## Chapter 3 — Packages

| # | On screen | Narration |
|---|---|---|
| 3.1 | A SKOS concept rendered as a plain resource | A package adds support for a vocabulary to a dataspace. |
| 3.2 | Terminal: `ldh packages list`, `ldh packages add …/editor/taxonomy/#this` | Installing one takes a single triple, written here from the command line. |
| 3.3 | The same concept: the tree in the content column, narrower and broader views | The taxonomy editor package brings a concept tree, views for broader and narrower concepts, and forms that ask for a label in every language. |
| 3.4 | The package ontology under `admin/ontologies/`, opened for editing | Its ontology is copied into the dataspace, where it is edited like your own. |

## Close

| # | On screen | Narration |
|---|---|---|
| 4.1 | The footage fades into the title card | Classes, forms, views, charts and access rules are all RDF documents. The application is data. LinkedDataHub is open source, under the Apache 2.0 licence. |

## Pronunciation

ElevenLabs reads acronyms unpredictably; these go into a pronunciation dictionary (or are
respelled in the text sent to the API, never in this script):

| Written | Spoken |
|---|---|
| LinkedDataHub | Linked Data Hub |
| SPARQL | sparkle |
| RDF, RDFa | R D F, R D F A |
| SKOS | skos (rhymes with "boss") |
| SHACL | shackle |
| SPIN | spin |
| WebID | web I D |
| ORCID | orkid |
| `ldh` | L D H |
| CSV | C S V |

## Production notes

- **Synthesis**: one request per line to the ElevenLabs text-to-speech API, cached under a
  hash of voice, model and text, so an unchanged line is never re-billed and a render is
  reproducible. The API key lives outside the repository.
- **Licence**: commercial use of the output needs a paid ElevenLabs plan; the free tier
  requires attribution and excludes commercial use.
- **Disclosure**: the YouTube description says the narration is a synthetic voice.
- **Mix**: voice placed at each shot's start, music ducked under it (`sidechaincompress`),
  `highpass` + `loudnorm` to −14 LUFS — all in the local ffmpeg.
- **Prerequisites before shooting**: the demo dataspaces reinstalled on v6 at the public
  origin, versioning enabled on Northwind (1.12), and the package registry answering (3.2 —
  `https://packages.linkeddatahub.com/` returned 500 on 2026-09-29).
