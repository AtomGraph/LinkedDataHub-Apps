# Rules for scripted scenes

Every rule here came from watching a recording and finding it wrong, or from
measuring the running instance. They are constraints on what a scene may do, not
style preferences: a recording is a claim about what using the product is like, so a
step the audience could not reproduce is a false claim even when the pixels look
right.

Measurements are against `northwind-traders.demo.localhost` unless stated.

## Navigating

**A URI is never known, it is fetched.** No scene types or pastes a URI it merely
happens to know, into a form field or the address bar. To reference a resource,
navigate there by the most efficient route the interface offers, press the app's own
copy control, and carry the value back on the clipboard as a real `Meta+V`.
Synthesising a URL is the same violation — reaching ContentMode means clicking the
mode switcher, not appending `?mode=…#ContentMode`. The one exception is the scene's
own starting document: opening it is opening a bookmark.

**But a name is not a URI.** Any resource can be looked up in a combobox by its
title, name or label, without knowing its URI beforehand — and that is not a
shortcut around the interface, because the app does the lookup and binds the URI
itself, on camera. Typing `Territories` into the Object block's Value field offers:

```
Occupied territories            Concept
Non-self governing territories  Concept
All territories                 Object
Employee territories            CONSTRUCT
Employee territories            CSV import
employee_territories.csv        File
```

**Typing is not choosing.** The text in the box is only text — the binding happens
when a suggestion is *clicked*, because each `li.ac-cb-item` carries the URI in its
`@title` and in a hidden `input[name="ou"]`, and that hidden input is what the form
submits. The gesture is three parts and all three are on camera: type the label, read
the types in the dropdown, click the right one.

Each suggestion carries its **type**, and that is load-bearing, because **titles are
not unique**: Northwind's `categories.ttl` titles three resources "Products per
category" — an `ldh:Object`, an `ldh:ResultSetChart` and an `sp:Select` — and
"All customers" returns both an `Object` and a `View`. So a lookup always names the
kind it wants, never just the label; taking the first suggestion picks arbitrarily,
and taking the `Object` is the nesting bug arriving by a different door. A scene that
*creates* a resource whose title already exists in the data gives it a different one,
since no type filter separates two `sp:Select`s of the same name. Prefer this to the navigate-copy-return errand wherever the title is
known — it is strongest right after the scene has typed that title itself while
creating the resource. Fall back to navigate-and-copy only where the typeahead cannot
reach: another dataspace, or anything arriving through the proxy.

**When a copy IS needed, copy the inner URI.** From an Object block, take the URI of
the chart, query or view inside it, never the wrapping Object's. Using the Object's
URI for a new Object nests them and doubles the header chrome.

**Take the shortest honest route.** Every gesture costs screen time and attention, so
the route through a workflow should be the fewest reproducible steps that reach the
goal — not the most thorough demonstration of the navigation. The full inventory, in
rough order of how much they save:

| shortcut | replaces |
|---|---|
| **combobox lookup by title** | navigating to a resource, copying its URI, coming back — about four beats each time |
| **the chart's Create on a query block** | a separate chart constructor plus a URI errand |
| **double-click a graph node** | opening each related document to see what connects |
| **the backlinks popover** | a query, or guessing what points here |
| **parallax pivot while filtered** | re-filtering the related set by hand — the pivot carries the facet with it |
| **the search dialog** | scrolling a container, or a label facet (which hangs) |
| **the document tree / breadcrumbs** | retracing a path link by link |
| **tab switch** | browser back across a dataspace boundary, which does not work |

The drawer opens on a left-edge `mousemove` at `clientX === 0` exactly
(`client/navigation.xsl:307`); while closed it is `inert`.

The limit on all of this is reproducibility: a shortcut the viewer can see and repeat
is a shortcut, and anything else is a cheat — which is why a typed URI is out and a
typed *title* is in.

**Search, not a label facet, finds a resource by name.** The drawer's search is an
input: it opens the search dialog on submit, and the dialog renders its results as an
ordinary view. There is no typeahead dropdown on it.

**In 3D graph mode, double-click a node to expand it.** Its properties appear and the
graph grows to include what it points at, following the data rather than the document
— so the expansion crosses document boundaries and pulls in nodes from elsewhere. A
single click only shows details. This is the strongest thing graph mode does: a
static force layout is a hairball, an expanding one is the graph being walked.

**Every block has a backlinks button** (`button.tb-links`), which traverses the graph
backwards — the only route from a resource to what points at it. What it yields
depends on which way the data points: `/employees/2/` lists ten referrers,
`/products/1/` five, `/orders/10265/` one, `/customers/` none. Check before building a
beat on it.

**Returning from a proxied dataspace is a tab switch, not browser back** — and a tab
switch does not change the URL.

## Filtering

**Never facet on a label.** Name, Title, Company name, `rdfs:label`, and
`skos:prefLabel` — the last one included in the UNESCO thesaurus, whose Concepts
container leads with it. These hang: the facet value query appends a label lookup
over values that are already literals, and the second branch is an unbound-graph scan
with a seven-alternative property path across every graph in the store. Measured at
**28 s**, against **0 s** with the `OPTIONAL` removed (FINDINGS.md #1). A label facet
is a text lookup wearing a filter's clothes; facets are for filtering by a relation.

**Pivot while filtered.** The parallax pivot carries the facet with it, so filtering
and then pivoting answers "who is behind *these*". Measured on `/products/`: pivot to
Provider unfiltered gives 29 suppliers; filter to three categories first and the same
pivot gives 18, with the toolbar still showing `category 3 selected` beside
`via Provider`.

**`details.ldh-pivot-bar` is collapsed by default.** Its pills report
`visibility: visible` and a 127×28 box, but a closed `<details>` renders no content,
so a scene must click the `<summary>` first.

## Querying

**Every document is a named graph**, named by the document URI, because data is
written through the Graph Store Protocol. Nothing lands in the default graph, so
every query needs `GRAPH ?g { … }`. Without it the query returns zero rows and the
page draws an empty results table with correct headers — which looks exactly like a
rendering bug and sends you after the wrong layer.

**The triplestore is shared across dataspaces.** A search inside the UNESCO thesaurus
also returns Northwind's own `Beverages` category. Disambiguate by type and by
origin, not by label alone.

**A query with aggregates goes in a chart, never in a view.** `COUNT`, `SUM`, `AVG`,
`GROUP BY` — anything that collapses rows into a summary — is chart material. A view
renders *resources*: its rows open, facet, pivot and link. An aggregate produces
numbers with no resource behind them, so everything a view exists for goes dead —
nothing to open, nothing for the facets to filter, nowhere for parallax to go. Views
for resources, charts for summaries.

**A chart over an existing query is made from the query's own form action bar.** With
the query open, its action bar's **Create** button builds a chart with the query
already bound — no separate constructor, and no navigate-copy-return errand to fetch
the query's URI.

**An external endpoint is a resource, and its speed is a measurement.** DBpedia,
Wikidata, UniProt and the like are added to a dataspace as an instance of
`sd:Service`, and a query names one with `ldh:service`; the query then feeds a view
or a chart exactly as a local one does, so federation needs no special block.

```turtle
<#dbpedia-service> a sd:Service ;
    dct:title "DBpedia SPARQL service" ;
    sd:endpoint <https://dbpedia.org/sparql> ;
    sd:supportedLanguage sd:SPARQL11Query .
```

**Hardcoded `VALUES` is not federation.** Copying local values into a remote query is
a manual export pasted into SPARQL — the very step federation removes, and it goes
stale the moment the data changes. A federated query runs against the **local**
endpoint and reaches out with `SERVICE`, so the join happens at query time and the
local side is read rather than transcribed. Such a query carries **no `ldh:service`**:
that property binds the whole query to a remote endpoint, and the query has to execute
locally for the local graph to be in scope. Measured: 21 of 25 customer countries
joined live against Wikidata, 3.3 s rendered.

**External data must connect to local data.** A remote result set rendered beside a
local one is juxtaposition — it demonstrates nothing two browser tabs could not. The
connection is either that the remote query's **inputs come from local data** (local
values bound in with `VALUES`, so the answer is about *these* customers rather than
about the world), or that a **mapping is written** — `skos:exactMatch`, `owl:sameAs` —
linking the local resource to the remote one so later queries can traverse it.

**Time the query against the real endpoint before building anything on it.** External
services are slow, frequently rate-limited and sometimes down, and a view or chart
bound to one inherits all of it. A scene that discovers this on camera has already
failed. A worked example of the whole pattern ships in
`LinkedDataHub-Apps/docs/user-guide/query-data.ttl:79-82`.

**SPARQL typed on camera is multi-line and human-readable.** Let the editor indent,
then read the text back and verify it matches before saving.

## Modes and forms

**Layout modes have two scopes, and they are different controls over different data.**
The **document** toggle in the action bar renders the resources *this document
describes*; the **view** toggle in the view's own controls renders *that view's query
results*. Both menus offer the same names — Content, Properties, List, Table, Grid,
Map, Chart, Graph — which is exactly why they get confused.

Measured: `/territories/` in *document* Map mode draws an empty basemap centred on
0,0, because the container describes no geometry. The same page's *view* in Map mode
plots all 53 territories, because its query returns the children, which each carry
`geo:lat`/`geo:long`. When the intent is "show these results as a map or a chart", it
is always the view toggle.

**Do not switch to a mode that is already active.** Read the state first; the mode
helpers return `'already'`. A menu that opens and closes for nothing reads as a
script working through a list rather than a person choosing a view. The active mode
is on the toggle's own label — and that label runs the icon ligature straight into
the text (`grid_viewGrid`), so a word-boundary match never fires.

**Properties mode is required to create anything but XHTML and Object.** ContentMode
offers only those two; queries, views and charts are created from Properties
(document ReadMode), whose Create menu carries thirteen constructors.

**Find form fields by their property title, never by position.** Controls are not in
a stable order, and a positional pick silently writes into the wrong field — a title
typed into the middle of a query URI, for instance.

## Composing the page

**Take the inventory before writing the scenario.** `node inventory.mjs --base …`
prints the documents, the questions already answered as charts, the views, the saved
queries, the classes by instance count and any declared `sd:Service`. Read it first —
checking afterwards costs a re-record, checking first costs a command. And a *guessed*
gap is not a gap: "which products were never ordered" looks unanswered and returns 0
rows, because every Northwind product has been ordered. Run the question before
scripting it.

**Never create what the dataset already has.** A scene that builds a query, view or
chart the app already ships is not showing a workflow — it is re-typing the demo, and
it leaves near-duplicates that make every later lookup by name ambiguous. Before
scripting a creation beat, list the existing titles and pick a question the data
cannot yet answer. A **gap** question — which products were never ordered, which
categories no supplier covers — is usually both novel and more interesting, because
the answer is an absence and no existing chart is showing it.

**A workflow ends in a document.** Browsing alone leaves nothing behind; a finding
written into a ContentMode document is a deliverable, which is what makes the scene a
job rather than a tour.

**The page narrates.** Interleave `ldh:XHTML` and `ldh:Object` blocks so prose poses
the question, an object shows the evidence, prose says what it means. The prose being
typed *is* the narration, so the artefact is the script. This is how the Northwind
pages are already built.

**Only `ldh:XHTML` and `ldh:Object` may be `rdf:_N` values.** Everything else — a
chart, a view, a query, a container — is embedded by wrapping it in an `ldh:Object`
whose `rdf:value` points at it. This is enforced: a `PATCH` adding
`<doc> rdf:_1 <#q>` where `<#q> a sp:Select` is rejected **422 Unprocessable
Entity**, because the whole post-PATCH graph is SHACL-validated
(`DocumentHierarchyGraphStoreImpl:575`). A resource can still live in the document
*without* an `rdf:_N` — it renders in Properties mode either way, which is how a
query gets seeded off camera.

**Block order is not creation order.** Blocks can be dragged into place afterwards,
so create them in whatever order navigates cheapest.

**A filtered view cannot be saved.** Facet and pivot state lives in the block's JS
cache — not in the URL, not on the resource. What persists is a saved `SELECT` as a
view block, a chart's type and axes, an `ldh:Object` reference, and prose. So:
explore with facets, then express the finding as a query or a chart and save that.

**The first two seconds are the strongest thing in the clip.** Length is not what
loses viewers — the opening is; a 60s clip and a 15s clip shed the same people in the
first two seconds, so length is cheap and the opening is expensive. Cold-open on the
payoff — the map filled with pins, the graph expanding, the finished page — then cut
back to the question and show how it was reached. Every scene as built opens on an
*empty document*, which is the worst available frame in the only two seconds that
matter. The opening must be a **real moment from this take**: a cold open showing
something the workflow never produces is the same lie as a staged screenshot. The
marks sidecar makes it a trim, not a re-record.

**Scenes are workflows, not tours.** Open on a question a real user would have, let
each step follow from the one before, and end by answering it. Reaching for a control
because the control exists is the failure mode.

## Recording

**Never shoot in the responsive mobile layout.** Record at normal desktop
resolution, timeline formats included. The narrow layout is not how anyone uses
LinkedDataHub, so filming it advertises a product that does not exist — and it
collapses the drawer, the multi-column content and the view toolbar, which are the
things being shown. Legibility arithmetic pushes the other way (a 13px cell is 3.6px
at 1440 shown 400 wide, 12.1px at 430) and that pull has to be resisted: fix
legibility by cropping into a region of the desktop layout, or by choosing beats
whose payoff is not small text.

**The cursor must be drawn.** `page.mouse.move()` moves no visible pointer, so an
unmodified recording shows a UI operating itself with nothing touching it.

**Seed the first-time-message cookie** (`LinkedDataHub.first-time-message`) rather
than filming its dismissal; its backdrop swallows every click on a fresh profile.

**Fixtures reset off camera**, through the `ldh` CLI, before the browser context
exists.

**Verify on the running instance**, not by reading the code — computed styles and
measured boxes, never "it should".
