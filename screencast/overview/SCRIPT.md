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
| 0.1 | Graph mode on an order, maximised, the camera orbiting while the layout settles | LinkedDataHub is an open-source Knowledge Graph application platform. It serves federated Linked Data dataspaces from a SPARQL-compliant triplestore, and works with any RDF Knowledge Graph out of the box. |
| 0.2 | The orbit continues, closing in | It works as a thin proxy layer on top of the triplestore, providing the user interface, authentication, authorization, and the other enterprise-grade features this video shows. |

## Chapter 1 — Knowledge management

### Flow A — Browsing (tree → container → modes → graph → related results → search)

| # | On screen | Narration |
|---|---|---|
| A1 | The drawer opens on the document tree; a container is opened | The left sidebar shows the document tree and the classes in the data. Every document is also a named graph in the backend triplestore. Here we open the Territories container. |
| A2 | The container's child listing cycled: list, table, grid, map | Containers are like folders: they hold items and other containers. Here, the Territories container's children are shown as a list, a table, a grid and a map. |
| A3 | Graph mode; a node double-clicked, the graph grows; a node opened | Graph mode renders resources as an interactive 3D network. Double-clicking the order's customer loads the customer's own document into the graph, and the node opens as a page. |
| A4 | On the opened document, a facet filters the orders to the delivered ones; then the pivot bar re-centres the results on a related class | A view renders a paginated SPARQL query projection. Facets narrow these orders to delivered ones, and parallax navigation jumps to the sales reps who took them. |
| A5 | The search dialog; a label typed; typed results | The search box finds resources by their titles and labels. Typing Seattle finds the Seattle territory. |
| A6 | A film's page on a review site typed into the address bar; it opens in a new tab and renders as a resource through the proxy; an actor's link followed in the same tab | The address bar also opens external URLs, one tab per origin. RDF documents can be browsed, as can web pages with embedded JSON-LD, like this film and its actors. |

### Flow B — Authoring (query → results → chart → page → annotation → embed → drag)

| # | On screen | Narration |
|---|---|---|
| B1 | A SELECT typed into a new query document and saved; its results render | Queries, views and charts are resources like any other, stored in documents and placed on pages as blocks. This query counts the sales reps per region, with its results below. |
| B2 | A chart bound to the query from its action bar; the bars draw | A chart is bound to a query by choosing the chart type, the category and the series. Here, a bar chart of the reps per region. |
| B3 | Content mode on the document; a sentence written in a prose block | Content mode renders a list of blocks: XHTML, and objects transcluded from other resources. Text is edited in place, like this sentence about the Eastern region. |
| B4 | A word selected; the annotation dialog; the word linked to a resource | Select a word and annotate it with RDFa to link it to a resource. Here, the word chart is linked to the chart we just made. |
| B5 | The chart embedded as an object block; the block dragged above the prose | An object block embeds any resource by its URI: a query, a chart, a view, or Linked Data from elsewhere. Here it embeds the chart, and dragging reorders the page. |
| B5b | + Object; a YouTube link typed as the value; Save; the video card | A video link embeds the same way: its metadata is read as RDF, and Tim Berners-Lee's TED talk plays on the page. |

### Flow C — Bringing data in (fork → CSV import → drop a file → drop RDF)

| # | On screen | Narration |
|---|---|---|
| C1 | A remote RDF document opened through the proxy, then forked into the dataspace | Forking copies a Linked Data document into a named graph in your dataspace. Here, the Beverages concept from the UNESCO Thesaurus is copied into Northwind. |
| C2 | The CSV import form: file, mapping query; the imported container | A CSV import maps each row to RDF with a SPARQL CONSTRUCT query. Here, the products file, and the query that maps a row to a product. |
| C3 | A photo dropped on a document; then a Turtle file dropped on another | Drop a file on a document to upload it, like this employee photo. Drop an RDF file, and its triples are added to the document's graph. |

### Flow D — Versions (history → diff → restore)

| # | On screen | Narration |
|---|---|---|
| D1 | The History dialog on a document that has been edited twice | With versioning enabled, every write becomes a version, with its datetime and the agent who made it. The Rockville territory has been edited several times. |
| D2 | A version diff; then a restore; the page re-reads | Select two versions to see the diff: the description changed. Restore writes an old version back as a new one, and the versions in between stay. |

## Chapter 2 — Low-code platform

### Flow E — The model builds the interface (create → violation → save → view → scheme → width)

| # | On screen | Narration |
|---|---|---|
| E1 | Create in a property view's header; the generated form | Views can also be attached to a property in the ontology, and render on every resource of its domain or range. Here, Create opens a form built by the Product constructor. |
| E2 | A required field left empty; Save; the violation on the field | Every write is validated against the model's constraints. Leave the product's name empty, and the form shows the violation on that field. |
| E3 | The field filled; Save; the same view picks up the record | With the name filled in, Save writes the product. Views are SPARQL queries, so Beverages now lists thirteen products instead of twelve. |
| E3b | The new record opened; the pencil; a description typed; Save; the page re-reads | To edit a resource, open its form with the pencil button. Here, a description is added to the new product. |
| E3c | The record's form again; Edit constructors; the Product constructor dialog, its properties and their types; Cancel | Edit constructors opens the Product constructor: the properties every new product starts with, each a typed literal or a resource of some class. Change it, and the forms change too. |
| E4 | The page switches dark to light and back | The interface follows the reader's light or dark colour scheme, and switches with it, without a reload. |
| E4p | The same page at phone width, scrolled | The layout is responsive: on a phone the same page reflows to a single column. A dataspace can also override any part of it with its own XSLT stylesheet. |

### Flow F — The CLI and access (push → live → make-public → private window)

| # | On screen | Narration |
|---|---|---|
| F1 | Terminal: `ldh push` a folder of Turtle; the plan prints, the URLs stream | The ldh command line drives the same HTTP API as the user interface. Here, ldh push uploads the LinkedDataHub documentation, a folder of Turtle files. |
| F2 | The browser: the pushed dataspace, rendered | And the documentation is live as a dataspace. Scripts and agents use the same HTTP API as the browser does. |
| F3 | Terminal: `ldh admin create group`, `ldh admin create authorization`, `ldh admin make-public`; then the page in a private window, signed out | Access control uses W3C ACL authorizations, which are RDF too. Here the CLI creates an Editors group, lets it write the user guide, and makes the dataspace public. |
| F3b | Terminal: `ldh get --accept text/turtle` on the home page just made public; its Turtle on screen | Every document has both an HTML and an RDF representation. Ask the home page for Turtle, and you get Turtle. |
| F4 | The sign-in screen: WebID, Google, ORCID — **deferred**: the dev stack has no Google or ORCID configured and shows only Sign up; shot later on a stack that has them, as a standalone anonymous take | You can log in with a WebID certificate, or with Google or ORCID. |

### Flow H — Agents (ask → plan → execute → the chat stays → an agent over MCP)

The assistant (H1–H4) ships in 6.1.0: an `ldh:Chat` block started from the create bar, a question
written as a Web-Algebra plan by the stack's `web-algebra` service, run only on Execute, under the
reader's own access control, each turn stored as an `ldh:ChatTurn`. Shooting it needs the
`web-algebra` service and the `openai_api_key` secret on the stack.

The MCP half (H5–H7) runs Web-Algebra 2.0.0, built from the local checkout: it sends `If-Match` on
POST, PUT and PATCH (PyPI 1.5.0 does not, and every write to an existing document was refused
`428 Precondition Required` on 2026-10-03), and its `ldh-CreateContainer` and `ldh-CreateItem` write
the current document-hierarchy namespace (2026-10-05; with the old LDT one a new container was taken
for an item and refused children). The command on camera is the docs page's `uv run --with
web-algebra`, resolved to that build through `UV_FIND_LINKS` off camera.

| # | On screen | Narration |
|---|---|---|
| H1 | A Northwind document; the create bar's Assistant button; "Chart the five customers who ordered the most" typed; the steps report as the plan runs | The assistant takes a question in plain words and writes a Web-Algebra plan. A plan that only reads runs right away, like this one about Northwind's best customers. |
| H2 | The answer's sentence; the rows drawn as a bar chart; the trace unfolded, its three steps | The answer comes back in words, with the results drawn as a table, a grid or a chart. Here, five customers by number of orders. |
| H3 | A follow-up: "Add the chart to this page"; the plan card waits, AddSelect, AddResultSetChart and AddObjectBlock listed; Execute; the page catches up with the new chart block | A plan that writes waits until you press Execute. This one adds the chart to the page as a block. |
| H4 | The page reloaded; the chat block with both turns, the composer under them | The conversation is a block in the document, stored as RDF, so it is still there after a reload. |
| H5 | Terminal: `claude mcp add web-algebra …`, then `claude`, `/mcp` listing it as connected | Web-Algebra is a separate open-source project: composable operations for loading, querying and writing Linked Data. Its MCP server gives agents like Claude Code these operations as tools. |
| H6 | Terminal: the prompt from the docs page, aimed at the Northwind dataspace; Claude Code's tool calls going by, then its summary | Ask for something to build rather than code. Here: a container for books, three books with authors, and a chart of books per author. |
| H7 | The browser: the books container, the three items, the chart | The container, the books and the chart are there, and you can keep editing them by hand. The agent and you work on the same documents. |

## Chapter 3 — Packages

### Flow G — One triple (before → add → after → edit)

| # | On screen | Narration |
|---|---|---|
| G1 | A SKOS concept rendered as a plain resource, no tree | A package adds support for an RDF vocabulary. Without one, this SKOS concept, Denmark, renders as a plain resource. |
| G2 | Terminal: `ldh packages list`, then `ldh packages add …/editor/taxonomy/#this` | Installing a package takes a single triple, and ldh packages add writes it. |
| G3 | The same concept: the tree in the content column, broader and narrower views | With the taxonomy editor package installed, Denmark gets a concept tree, and views of its broader and narrower concepts. |
| G4 | The package ontology under `admin/ontologies/`, opened for editing | The package's ontology is copied into the administration dataspace, where you can edit it like your own. |

## Close

| # | On screen | Narration |
|---|---|---|
| Z1 | The footage fades into the title card | Classes, forms, views, charts and access rules are all RDF resources. LinkedDataHub is open source, under the Apache 2.0 licence. |

Forty lines: about 6 minutes of speech, 9½–10 minutes with the pauses and the gestures that
run under no narration (the cut of 2026-10-05 is 9.7 minutes).

## Takes

One scene per flow under `scenes/overview-*.mjs`, each firing `<shot>-start` and `<shot>-end`
beats named after the shots above (plus intermediate ones), so the cut places a line at its
shot's start beat and holds the shot to its end beat. Dark, 2× (2880×1800 with the document
zoomed 200 %), the supercut's recipe; the graph takes at 1×, where the canvas is sharp.

| Take | Shots | Notes |
|---|---|---|
| `overview-0-graph` | 0.1 | an order in Graph mode, maximised to the whole frame (no page chrome, the canvas's controls and the pointer hidden) and orbited by the camera, closing in, while the layout settles; 1×. The take forces the maximised canvas to the full height: a later `.content-body > .graph-3d-canvas` rule in `ldh.css` sets it back to `height: auto`, 117 px short |
| `overview-a-browse` | A1, A2, A5 | the tree, the modes, search |
| `overview-a-graph` | A3, A4 | the order graph expanded and opened; Related results; 1× |
| `overview-b-author` | B1–B5 | scratch document `overview-compose`; the chart's URI is copied from its block after a reload (the just-saved render's copy control writes an empty string) |
| `overview-c-data` | C1–C3 | three scratch documents; the CSV form is not saved |
| `overview-d-versions` | D1, D2 | a fresh scratch slug per run, three PUTs through ldh; Compare from the first described version; Restore from the current version (FINDINGS #16) |
| `overview-e-model` | E1–E4 | Product on Beverages' products view: the title filled, the name empty, refused by `:MissingName`; then the scheme switch |
| `overview-e-phone` | E4 (phone) | 390×844 at device scale 2, recorded at 780×1688, light; composited beside the desktop frame |
| `overview-f-cli` | F1–F3b | docs.localhost emptied, its public authorization reseeded, and the previous take's Editors group and authorization removed off camera; three terminal takes recorded inside the browser take (`tapes/overview-f-push.tape`; `tapes/overview-f-public.tape`: create group, create authorization, make-public, the first two taking the administration base URI as their positional; `tapes/overview-f-get.tape`: `ldh get --accept text/turtle`) |
| `overview-f-anon` | F3 (anonymous) | run with `--anonymous` after the CLI take |
| `overview-h-assistant` | H1–H4 | recorded clean 2026-10-05 (94 s, 15 beats). The scratch document `overview-assistant` ("Our best customers") reset off camera; a live model (`gpt-5.5`), so the plan and the answer's wording differ per take — the beats assert the card's states, not its text. The question runs on arrival (~20 s to the steps, cut); "Add the chart to this page" plans as Sequence(AddSelect, AddResultSetChart, AddObjectBlock), which needed REST-VKG's `ldh-operations.md` to say a view or chart is placed by `AddObjectBlock`; "as a view" fails, since a follow-up builds on the rows as seen (names, not customer URIs). Bar charts start at zero and a chart block's Save goes with its controls since LinkedDataHub's fix of the same day. The plan card's summary prints the document URL, `localhost` in frame until the public re-shoot |
| `overview-h-agent` | H5–H7 | recorded clean 2026-10-05: the terminal take (`tapes/overview-h-agent.tape`, 149 s; the agent's run 55 s, cut at 4.5×) from the linkeddatahub.com deployment's directory, then the books container in the browser. Off camera: the previous take's `books/` documents removed, the Web-Algebra wheel built, `CLAUDE*` variables cleared (an inherited one puts a warning in Claude Code's footer), claude.ai connectors and the Figma plugin hidden from `/mcp`, the MCP server removed after. The agent's titles and authors differ per take. `localhost` in frame until the public re-shoot |
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
