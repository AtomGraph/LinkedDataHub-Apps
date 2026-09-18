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

**Graph mode has three node gestures, and they do three different things**
(`client/graph3d.xsl`). **Double-click expands forward**: the node's properties appear
and the graph grows to include what it points at, following the data rather than the
document, so the expansion crosses document boundaries. **Right-click expands
backwards** along the backlinks — what points *at* this node. **Single click selects**:
it renders the node's description into `#info-content-<canvas-id>`.

That info panel is the way out of the canvas. `rdf:Description` in mode
`ldh:graph3d-info` emits `<a href="{$node-id}" target="_blank">`, so the node's URI is
an ordinary link and clicking it opens the document in a new browser tab — the app does
not intercept it. **The graph is therefore not a dead end**, and a scene that opens on
it does not have to leave graph mode to prove the canvas is part of the application.

Two things about that link, both found the hard way. It appears **only for a node that
has a description in the loaded graph**: the click handler falls back to rendering the
bare label for a stub, and that fallback emits no anchor — so select a node *after*
expanding it, not before. And the anchor is inline inside a taller `<dd>`, so the
centre of its bounding box resolves to the `<dd>`; a click aimed there is refused by the
hit-target check while the link sits visibly under the pointer. `lib/graph.mjs`
`select()` returns a point that `elementFromPoint` actually resolves to the anchor.

A static force layout is a hairball; an expanding one is the graph being walked.

**Every block has a backlinks button** (`button.tb-links`), which traverses the graph
backwards — the only route from a resource to what points at it. What it yields
depends on which way the data points: `/employees/2/` lists ten referrers,
`/products/1/` five, `/orders/10265/` one, `/customers/` none. Check before building a
beat on it — and check *what* it yields, not just how many. On a territory it answers
with the content blocks that reference it rather than with the rep who serves it,
because `schema:areaServed` points from the employee and a block reference is a
referrer too. A backlinks beat that expected a person gets a list of `id<uuid>` blocks.

**A map marker's popup carries the resource's own controls**, so a pin is a drill-down
and not just a dot: the popup holds the title as a link, the type chip, `button.tb-links`,
`button.btn-copy-uri`, `button.btn-edit`, and the resource's property values as links —
including `schema:containedInPlace`, which is how a territory reaches its region without
leaving the map.

**The pin is chosen before the click, never by clicking.** Opening pins in turn until one
turns out to be Southern is trial and error on camera — a viewer sees the cursor wander,
and a pixel scan cannot tell pins apart or even find the ones that overlap. The harness
captures every `ol.Map` the page builds (`window.__olMaps`, `lib/harness.mjs`), and each
feature's id is the resource URI (`client/map.xsl`), so `clickMarker(page, cursor, uris)`
asks the map where a known resource's pin is, scrolls it into view if it is below the fold,
and clicks it once. The URIs come from a read-only SPARQL query at scene start
(`lib/sparql.mjs`), like every other value a scene depends on.

**A graph node is under the pointer only when the canvas says so.** The 3D projection
of a node is not where its click lands: label sprites are drawn above every node and take
hits, so a double-click aimed at a customer once dereferenced the `schema:Order` class
sitting 16 px below it and pulled 97 nodes of schema.org into the canvas. The canvas
dispatches `ForceGraph3DNodeHoverOn` with the hovered node's id
(`client/3d-force-graph.xsl`), so `approach()` in `lib/graph.mjs` moves the pointer, reads
that id back, tries a ring of nearby points, and turns the view by dragging when none of
them is the node meant — and `expand()` confirms afterwards that the document it loaded is
the node's own. Nothing on the canvas is clicked on a projected coordinate alone.

**The strongest scenes close a loop: read → write → the same read again.** Opening Houston
works because the territory map is read at the open (53), a territory is created, and the
same map is read at the close (54). The write is not the point; the second read is — it
shows the app answering to what was just put into it. A scene that reads, then writes a
query or a chart, then reads *that*, has added a lens; the data it opened on is unchanged,
and the clip is thinner for it. So: open on evidence, write into the data, and end on the
evidence re-read through the same view, query or chart.  Scored as **C** in the rubric.

**W is the multiplier, and it has to be used as one.** A scene that changes the data is
not thereby realistic: "A rep moves to Seattle" moved a pin by typing latitude and
longitude into a person's record — a loop (C 10) along a real route (R 9) that nobody
would ever walk — and it scored 74 because W sat at 8, where every scene's W sat.
The scale: **10** a job someone does this week, in exactly this way; **8** a real job,
done a plausible way; **6** a real question, but a workflow a demo invents; **4** the
data changes, but no one would make it change like that; **2** staged. Below 6 the
scene is not shot, whatever the other columns say.

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

**The first two seconds are the strongest thing in the clip, so the scene must START
there.** Length is not what loses viewers — the opening is; a 60s clip and a 15s clip
shed the same people in the first two seconds, so length is cheap and the opening is
expensive.

The answer is **not** a cold open. Lifting a later beat to the front is an edit, and
an edit that shows a moment out of order is the same lie as a staged screenshot —
worse, it tells the viewer the workflow had nothing worth watching where it actually
began. What the scene does instead is **begin on a document whose loaded render is
already its strongest frame**:

| Document | what it renders without a gesture |
|---|---|
| `/territories/` | `ac:MapMode` — 53 pins |
| `/employees/` | `ac:GridMode` — nine photographs |
| `/categories/` | `ac:GridMode` — eight food photographs |
| an order, in Graph mode | 28 nodes and 52 links on the dark canvas |
| `/` | the dashboard's charts |
| `/orders/`, `/products/`, `/customers/` | `ac:TableMode` — the weakest openings in the dataspace |

Read the mode off the document rather than assuming it: it is `ac:mode` on the view
block, and it is what decides whether an opening is a map or a table.

**And the opening state has to be paid for, before the work starts.** A strong first
frame the clip never refers back to is decoration, and the viewer feels the seam. The
page the scene leaves behind must carry an `ldh:XHTML` block saying *why that state was
on screen and what it could not answer* — the map plots all fifty-three and cannot draw
an absent rep; the dashboard answers by country and the territories are cities; the
order book shows a row and the graph shows what the row is hiding.

Three things about that block, all of them learned by getting it wrong:

- **It is written BEFORE the work, not after.** Writing it at the end satisfies a grep
  of the finished document and fails the clip: the viewer goes from a grid of faces
  straight into Properties mode and a query editor with nothing on screen saying why.
  The question is the beat immediately after the opening exploration, and every
  authoring beat comes after it.
- **The blank page it is typed onto is fine.** That is the mid-clip blank the opening
  rule already permits, and two seconds of it costs nothing where it lands.
- **It has to survive pacing.** `freezedetect` speeds a static stretch threefold, so a
  700 ms hold after the beat is a fifth of a second in the cut — not a sentence anybody
  read. Hold ~3 s minimum, and check the gap to the next beat in the paced sidecar
  rather than trusting the raw timeline.

**And every move after the opening is a click the viewer can follow.** A scene has
exactly one `page.goto()` — the document it opens on. Reaching the write-up page by a
second `goto` is a teleport: the viewer sees the opening state, then a different page,
and nothing in between that they could have done. It reads as a cut to something
unrelated, whatever the page says once it loads. So the write-up page is **created on
camera, from where the scene is** — breadcrumb up to Root (`a.bc-pill` in the action
bar's `div[role="navigation"]`, present in every layout mode, graph included), then
`Create ▸ Item`, whose modal opens inside the active pane with a Title and no slug, and
whose Save lands on the new page in Properties. Its path is a UUID, so the previous
take's page is removed off camera **by title** (`fixture.mjs` `deleteByTitle`), not
reset by slug.

Getting back to that page later has three routes that fail and one that works,
measured: the drawer's search does **not** return a page created a minute earlier; the
app opens no tab for a same-dataspace move; the tree lists it but would not open from
graph mode. The container's own children list shows it at once, on one page — so the
way back mirrors the way out: breadcrumb to Root, then the page's entry in the list
(`nav.mjs` `listGo`). Leaving a graph to come back to one: the drawer's search by
identifier, then the mode switcher — not the opening bookmark a second time.

`grep -c 'page.goto(' scenes/*.mjs` must print `1` for every scene. It is the cheapest
check in the rig and it catches the defect that every other check missed.

The corollary is that **the document a scene writes into is opened late**. A blank
page is the honest start of the authoring half and the worst possible first frame, so
the scene explores first, and the fixture is opened once there is something to put on
it — mid-clip, where two seconds of empty page costs nothing.

What is left in front of the opening state is the page load, and that IS trimmed:
`render/head.mjs` cuts to the first beat, which a scene fires the instant its opening
view has painted. Warming the document off camera (`runScene({ warm })`) shortens the
load but does not remove it — the remaining second is Saxon-JS and the map library
drawing, which is CPU in the browser rather than network. Waiting on paint, not
presence: an `<img>` is in the DOM a beat before it decodes, which is how one take
opened on a grid of nine white boxes.

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

**The cursor and the control it clicks are visible — by scene design, not by the
crop.** A crop that frames the block a result appears in while the click lands outside
it shows an effect with no cause. The fix is in the scene: click the control nearest the
result (the form's own Save, the view's own Create, the pill in the bar above the
graph), let the drawn cursor travel inside the framed block, and give the beat a focus
box that covers both the control and the result. Widening the crop to contain every
click was tried and reverted — it pushed every shot out to the full frame and flattened
the pans. And the camera **pans to the action control** before it is clicked: the scene marks a
beat as the pointer arrives on the control (its focus box is the control), and the
shot lists that beat in `via`, so the crop glides block → control → result on smooth
moves (`cropPath` in the cutter) rather than widening. Every beat still records
`pointer`; the cutter uses it only when a shot sets `keepPointer: true`. On camera a
control is clicked with the drawn cursor
(`cursor.click`, or `cursor.moveTo` then the click), never a bare `locator.click()`.

**A camera move between blocks is gradual.** When a supercut shot pans from one block
to another — the query to the chart made from it, the XHTML block to the Object block,
any block to any other — the crop travels on a smooth curve over about 1.4 s
(`move: "pan"`, `moveSeconds` in `render/supercut.json`), timed to the new block's
arrival, never a jump. The same for a scroll on camera: `behavior: 'smooth'`, never an
instant `scrollTo`. A jump inside one page reads as an edit; a slow pan reads as the
viewer's own eye moving down the page.
