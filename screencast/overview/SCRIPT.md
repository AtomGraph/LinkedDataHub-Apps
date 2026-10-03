# LinkedDataHub overview — narration script (draft 2)

The flagship film: every feature `docs/about.ttl` lists, in three chapters, narrated with an
ElevenLabs voice. It fills the About page's "Screen recording: LinkedDataHub overview" slot
and replaces "What's new in LinkedDataHub v3?" on YouTube.

**Voice**: Daniel (`onwK4e9ZLuTAKqWW03F9`), model `eleven_multilingual_v2`. Measured on the
draft-1 intro line: 40 words in 17.8 s, about 135 words a minute. So a line of 25 words
holds its shot for 11 s; every line below is kept to 30 words or fewer.

**Flows, not shots.** Draft 1 had 26 one-gesture shots at 11 s each, which showed features
without leaving time to take them in. This draft groups the features into continuous
sequences on one screen, so the narration runs across a flow instead of re-establishing the
scene at every feature. Target 6–7 minutes, roughly 600 words.

The voice sets the timing: each line is synthesised on its own, and its shot holds for the
line's length plus a short pause. Captions become an `.srt` generated from these lines; only
chapter titles are burned in.

## Intro

| # | On screen | Narration |
|---|---|---|
| 0.1 | Graph mode on a document, the nodes settling | LinkedDataHub is an open-source platform for Knowledge Graphs. The documents, the forms, the charts and the access rules are all RDF data behind one HTTP API. |

## Chapter 1 — Knowledge management

### Flow A — Browsing (tree → container → modes → graph → related results → search)

| # | On screen | Narration |
|---|---|---|
| A1 | The drawer opens on the document tree; a container is opened | A dataspace is an origin with its own URI space, backed by an RDF dataset arranged as a tree of documents. Each document is a named graph, with a URL you can open or link to. The drawer lists the dataspace's classes too, with their instance counts. |
| A2 | The container's child listing cycled: list, table, grid, map | The tree has two kinds of document: containers, which can hold child documents, and items, which cannot. Here a container's children are shown as a list, a table, a grid and a map. |
| A3 | Graph mode; a node double-clicked, the graph grows; a node opened | In graph mode, documents are nodes and links are edges. Opening a node follows the link into another document. |
| A4 | On the opened document, a facet filters the orders to the delivered ones; then the pivot bar re-centres the results on a related class | A view's facets filter its results by their values; here, the delivered orders. Related results follow a property from one set of results to the next. |
| A5 | The search dialog; a label typed; typed results | And search finds any resource by its label, across the whole dataspace. |
| A6 | A film's page on a review site typed into the address bar; it renders as a resource through the proxy; an actor's link followed | Any URL goes in the address bar. A Linked Data document renders like a local page, and so does a web page with JSON-LD in it. Here a film page from a review site is read as data, and its links can be followed. |

### Flow B — Authoring (query → results → chart → page → annotation → embed → drag)

| # | On screen | Narration |
|---|---|---|
| B1 | A SELECT typed into a new query document and saved; its results render | A SPARQL query is a resource like any other, stored in a document. It renders as its own kind of block: a Run button, and the results beneath. |
| B2 | A chart bound to the query from its action bar; the bars draw | A chart is bound to the query with one form: the axes come from its variables. |
| B3 | Content mode on the document; a sentence written in a prose block | Content mode builds the document as a sequence of blocks: XHTML prose, and object blocks that embed other resources. The prose is edited in place, in an XHTML and RDFa editor. |
| B4 | A word selected; the annotation dialog; the word linked to a resource | Select a word and link it to a resource. The sentence holds a machine-readable statement. |
| B5 | The chart embedded as an object block; the block dragged above the prose | An object block embeds a built-in block: a query, a chart, or a view, which lays a query's results out in a layout mode. It can also embed any Linked Data resource. Dragging a block reorders the page. |
| B5b | + Object; a YouTube link typed as the value; Save; the video card | A link to a video embeds the same way: its metadata is read as RDF on the fly, and the video plays on the page. |

### Flow C — Bringing data in (fork → CSV import → drop a file → drop RDF)

| # | On screen | Narration |
|---|---|---|
| C1 | A remote RDF document opened through the proxy, then forked into the dataspace | Linked Data from anywhere on the Web opens through the proxy, and can be copied into the dataspace as a document of its own. |
| C2 | The CSV import form: file, mapping query; the imported container | A CSV file is imported by mapping each row to RDF with a SPARQL query. |
| C3 | A photo dropped on a document; then a Turtle file dropped on another | Dropping a file on a document uploads it. Dropping an RDF file adds its data to that document. |

### Flow D — Versions (history → diff → restore)

| # | On screen | Narration |
|---|---|---|
| D1 | The History dialog on a document that has been edited twice | With versioning enabled, every write to a document becomes a version of that document, with the agent who made it. |
| D2 | A version diff; then a restore; the page re-reads | The diff shows what changed, and any version can be restored. |

## Chapter 2 — Low-code platform

### Flow E — The model builds the interface (create → violation → save → view → scheme → width)

| # | On screen | Narration |
|---|---|---|
| E1 | Create in a property view's header; the generated form | Forms are generated from the model. A view declared on a property offers Create, and the class's constructor decides which fields a new instance starts with. |
| E2 | A required field left empty; Save; the violation on the field | Constraints are checked on every write, against the document as it would be afterwards, and a violation is shown on the field that caused it. |
| E3 | The field filled; Save; the same view picks up the record | Save writes the graph. Views are queries, so the new record appears wherever one matches it — here, in the view we started from. |
| E3b | The new record opened; the pencil; a description typed; Save; the page re-reads | Any record is edited the same way: the pencil opens its form, Save writes the graph. |
| E4 | The page switches dark to light, then narrows to phone width | The interface follows the reader's colour scheme and screen size, and a dataspace can override any part of it with its own stylesheet. |

### Flow F — The CLI and access (push → live → make-public → private window)

| # | On screen | Narration |
|---|---|---|
| F1 | Terminal: `ldh push` a folder of Turtle; the plan prints, the URLs stream | The command line uses the same HTTP API as the interface. Push a folder of Turtle files, and the dataspace is live, with its documents and its model. |
| F2 | The browser: the pushed dataspace, rendered | Everything the interface can do, an agent can do with the same requests. |
| F3 | Terminal: `ldh admin make-public`; then the page in a private window, signed out | Access is controlled by authorizations, which are RDF resources too. One command makes a dataspace public. |
| F3b | Terminal: `curl` with `Accept: text/turtle` on the home page just made public; its Turtle on screen | And the same document answers in RDF to anyone who asks for it. |
| F4 | The sign-in screen: WebID, Google, ORCID — **deferred**: the dev stack has no Google or ORCID configured and shows only Sign up; shot later on a stack that has them, as a standalone anonymous take | Agents sign in with a WebID certificate, or with Google or ORCID. |

### Flow H — Agents (connect → ask → the result) — **deferred**

Blocked on 2026-10-03: Web-Algebra (PyPI 1.5.0 and the local 2.0.0 checkout) sends no `If-Match`, so
on 6.0 every write to an existing document — `ldh-AddResultSetChart`, `ldh-AddView`, a PATCH — is
refused `428 Precondition Required`, and a dry run of the prompt below ended after 402 s with a
container and no items or chart. Shot once Web-Algebra does conditional writes.

| # | On screen | Narration |
|---|---|---|
| H1 | Terminal: `claude mcp add web-algebra …`, then `claude`, `/mcp` listing it as connected | An agent connects over MCP, through Web-Algebra, which exposes the same operations as tools. |
| H2 | Terminal: the prompt from the docs page; Claude Code's tool calls going by | It is asked for something it has to declare rather than code: a container, three records and a chart. |
| H3 | The browser: the books container, the three items, the chart | The agent wrote documents. They are on the page, editable by hand: the agent and the person work on the same data. |

## Chapter 3 — Packages

### Flow G — One triple (before → add → after → edit)

| # | On screen | Narration |
|---|---|---|
| G1 | A SKOS concept rendered as a plain resource, no tree | A package adds support for a vocabulary to a dataspace. |
| G2 | Terminal: `ldh packages list`, then `ldh packages add …/editor/taxonomy/#this` | Installing one takes a single triple, written here from the command line. |
| G3 | The same concept: the tree in the content column, broader and narrower views | The taxonomy editor package brings a concept tree, views for broader and narrower concepts, and forms whose labels have a language. |
| G4 | The package ontology under `admin/ontologies/`, opened for editing | Its ontology is copied into the dataspace, where it is edited like your own. |

## Close

| # | On screen | Narration |
|---|---|---|
| Z1 | The footage fades into the title card | Classes, forms, views, charts and access rules are all RDF resources. LinkedDataHub is open source, under the Apache 2.0 licence. |

Twenty-nine lines, about 600 words: roughly 4½ minutes of speech, 6–7 minutes with the
pauses and the gestures that run under no narration.

## Takes

One scene per flow under `scenes/overview-*.mjs`, each firing `<shot>-start` and `<shot>-end`
beats named after the shots above (plus intermediate ones), so the cut places a line at its
shot's start beat and holds the shot to its end beat. Dark, 2× (2880×1800 with the document
zoomed 200 %), the supercut's recipe; the graph takes at 1×, where the canvas is sharp.

| Take | Shots | Notes |
|---|---|---|
| `overview-0-graph` | 0.1 | an order in Graph mode, held; 1× |
| `overview-a-browse` | A1, A2, A5 | the tree, the modes, search |
| `overview-a-graph` | A3, A4 | the order graph expanded and opened; Related results; 1× |
| `overview-b-author` | B1–B5 | scratch document `overview-compose`; the chart's URI is copied from its block after a reload (the just-saved render's copy control writes an empty string) |
| `overview-c-data` | C1–C3 | three scratch documents; the CSV form is not saved |
| `overview-d-versions` | D1, D2 | a fresh scratch slug per run, three PUTs through ldh; Compare from the first described version; Restore from the current version (FINDINGS #16) |
| `overview-e-model` | E1–E4 | Product on Beverages' products view: the title filled, the name empty, refused by `:MissingName`; then the scheme switch |
| `overview-e-phone` | E4 (phone) | 390×844 at device scale 2, recorded at 780×1688, light; composited beside the desktop frame |
| `overview-f-cli` | F1–F3 | docs.localhost emptied and its public authorization reseeded off camera; two terminal takes recorded inside the browser take (`tapes/overview-f-push.tape`, `tapes/overview-f-public.tape`) |
| `overview-f-anon` | F3 (anonymous) | run with `--anonymous` after the CLI take |
| `overview-g-packages` | G1–G4 | the package removed off camera; the terminal take (`tapes/overview-g-packages.tape`) recorded between G1 and G3 |

## Pronunciation

ElevenLabs reads acronyms unpredictably; these are respelled in the text sent to the API,
never in this script or the subtitles:

| Written | Spoken |
|---|---|
| LinkedDataHub | Linked Data Hub |
| SPARQL | sparkle |
| SKOS | skos (rhymes with "boss") |
| WebID | web I D |
| ORCID | orkid |
| `ldh` | L D H |
| CSV | C S V |

## Production notes

- **Synthesis**: one request per line to the ElevenLabs text-to-speech API, cached under a
  hash of voice, model and text, so an unchanged line is never re-billed and a render is
  reproducible. The API key is read from `~/.config/elevenlabs/api-key`; the plan is
  Starter (30,000 credits a month; a full pass of the script is about 3,500).
- **Music**: generated with ElevenLabs Music to the film's length — an understated
  electronic bed, no vocals, nothing that competes with speech, with a lift for the title
  card — so the licence is the plan's. (The supercut's track was made in Suno.)
- **Sound**: no effects on the interface, which makes no sounds; one soft tone, generated
  once, marks each chapter card.
- **Disclosure**: the YouTube description says the narration is a synthetic voice.
- **Mix**: voice placed at each shot's start, music ducked under it (`sidechaincompress`),
  `highpass` + `loudnorm` to −14 LUFS — all in the local ffmpeg.
- **Stacks**: built and piloted on the linkeddatahub.com dev stack on localhost; the final
  pass on the public stack, so URIs in frame read the public addresses. Both need the three
  demos on v6, versioning on Northwind (D1–D2), the registry reachable (G2) and an empty
  dataspace to push into (F1).
