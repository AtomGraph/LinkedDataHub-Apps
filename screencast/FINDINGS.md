# Defects found while scripting the screencast scenes

Found by driving the real UI on `northwind-traders.demo.localhost` (linkeddatahub.com
stack, ~5,700 graphs) with Playwright. None are fixed — this is a handoff.

Every measurement below was taken against the running instance. Where something is
a hypothesis rather than a measurement it says so.

---

## 1. Facet values never load on large containers

**Severity** Blocking — the facet is unusable on the two biggest containers.

**Reproduce**
1. Open `https://northwind-traders.demo.localhost/orders/` (830 orders).
2. Click any facet pill in `.ldh-view-toolbar .left`.
3. `.facet-loading` and its indeterminate progress bar never resolve.

Also reproduces on `/customers/` (89 rows, "Company name" facet). Does **not**
reproduce on `/products/` (77) or `/employees/` (9), which answer in 1.5–4 s.

**Observed** The `POST /sparql` is issued 0.1 s after the click and never returns.
No console error, no failed request, no HTTP error status — the browser just waits.

**Measured** Taking the exact query the client sends and running it directly:

| Query | Time |
|---|---|
| as issued | **28 s** |
| identical, with the label `OPTIONAL` removed | **0 s** |

The entire cost is the label lookup.

**Cause** The facet value query appends a label lookup for the facet's values:

```sparql
OPTIONAL {
  { ?companyName (rdfs:label|dc:title|dct:title|foaf:name|foaf:givenName|foaf:familyName|skos:prefLabel) ?label }
  UNION
  { GRAPH ?labelGraph { ?companyName (…same 7-way path…) ?label } }
}
```

`?companyName` is bound by `schema:legalName`, so it is a **literal**. A literal can
never be the subject of a triple, so this OPTIONAL is guaranteed to match nothing.
The expensive half is the second branch — an unbound-graph scan with a
seven-alternative property path across every graph in the store.

**Where to start** The facet value query is assembled in
`src/main/webapp/static/com/atomgraph/linkeddatahub/xsl/client/query-transforms.xsl`
— the `SAMPLE()` of labels around `:546`, and the label property path around
`:640`–`:730`. Note the path there has a different alternative set from the one in
`client.xsl:132`/`:139`, so there are two label-path definitions in play.

**Suggested fix** Skip the label lookup when the facet's values are literals, or
guard it with `FILTER(!isLiteral(?value))`. The first branch alone is cheap; it is
the `GRAPH ?labelGraph` union that scans the store. Whether the size of the
container matters independently of the literal case is **not** established — the
literal facets are simply the ones that were tested.

---

## 2. The × on a parallax step chip is dead, and throws

**Severity** Medium — a visible control that does nothing and raises an error.

**Reproduce**
1. Open `/products/`, expand `details.ldh-pivot-bar`, click any pivot pill.
2. The toolbar grows a chip: `→ via Category ×`.
3. Click the **×** glyph inside the chip.

**Observed** The result count stays at 8 — the pivot is not cleared — and the page
throws:

```
Required cardinality of value in 'xsl:variable name="Q{}facet"' expression is
exactly one; supplied value is empty
```

Clicking the chip **body** instead works correctly: the count returns to 77 and no
error is raised. Verified both paths side by side.

**Cause** `client/block/view.xsl:2486`:

```xslt
<xsl:template match="div[@typeof = '&ldh;View']//button[contains-token(@class, 'facet-pill')]/span[contains-token(@class, 'x')]"
              mode="ixsl:onclick" priority="1">
    <xsl:variable name="facet" select="ancestor::div[contains-token(@class, 'facet')][1]" as="element()"/>
```

The parallax chip reuses the `facet-pill` class and contains a `span.x`, so it
matches this template — but it is rendered inside `span.parallax-steps`, which has
**no `div.facet` ancestor**. Confirmed in the page: `e.closest('div.facet')` is
`null` for the chip. `as="element()"` then fails on the empty sequence.

The chip's markup, for reference:

```html
<span class="parallax-steps">
  <button type="button" class="facet-pill parallax-step" title="https://schema.org/category">
    <input name="ou" type="hidden" value="https://schema.org/category">
    <span class="msi xs">arrow_forward</span><span class="pred">via</span><span class="val">Category</span>
    <span class="x"><span class="msi xs">close</span></span>
  </button>
</span>
```

**Suggested fix** Either exclude `parallax-step` from that template's match pattern
and give the step chip's × its own handler that removes the pivot, or make the
pattern's `$facet` binding tolerant and branch on which kind of pill was clicked.
The same `as="element()"` binding appears at `:2473` for the popover's Clear button;
that one is reached only from inside `.facet-pop` and looks safe, but it is the same
assumption.

---

## 3. A chart axis bound to a URI-valued variable renders raw markup

**Severity** Medium — makes the natural chart of the data unusable.

**Reproduce**
1. Open `/products/`, switch the view's mode to **Chart**.
2. Set Chart type = Bar chart, Category = `category`, Series = `price`.

**Observed** Every Y-axis label is the cell's escaped HTML rather than the
resource's label:

```
<a href="https:// northwind-traders.demo.loca…
```

repeated once per bar. Setting Category to a **literal**-valued variable (`name`)
renders correctly — which is why the pre-existing "Products by supplier" block on
the same page looks right: its axis is `supplierName`, a literal.

**Also, in the same render** the axis title and the legend print raw property URIs
where a label belongs — `https://schema.org/name` down the Y axis,
`https://schema.org/price` in the legend. Same substitution, two more places.

**Where to start** `client/block/chart.xsl` — the data-table construction that feeds
Google Charts. The axis label appears to take the rendered cell rather than the
value's label; the legend and axis title appear to take the property URI rather than
its label. Both are hypotheses from the rendered output, not read off the code.

**Effect** A chart of price by category — the question a viewer would actually ask
— is not currently possible, which is why the scene charts price by product name.

---

## 4. The query editor's prefix list is blocked as mixed content

**Severity** Low — a silent loss of autocomplete, not a failure.

**Reproduce** Open any document in Properties, `Create ▸ SELECT`, and watch the
console while the editor mounts.

**Observed**

```
Mixed Content: The page at 'https://northwind-traders.demo.localhost/…' was loaded
over HTTPS, but requested an insecure XMLHttpRequest endpoint
'http://prefix.cc/popular/all.file.json'. This request has been blocked; the
content must be served over HTTPS.
```

YASQE fetches its prefix definitions from prefix.cc over **http**, so on an HTTPS
instance the browser blocks it and the editor comes up without prefix
autocompletion. Nothing reports this to the user.

`https://prefix.cc/popular/all.file.json` serves the same file over TLS, so this
looks like a one-character fix wherever the endpoint is configured — or the list
could be bundled, which would also make the editor work offline.

---

## 5. The SPARQL endpoint could not render HTML — **fixed**

Every SPARQL result set requested as HTML used to 500. `ResultSetXSLTWriter` runs
`layout.xsl` over SPARQL Results XML, whose root is `sparql:sparql`; `layout.xsl:718`
bound `$local-pane` with `as="element()"` from `apply-templates … mode="ldh:TabPanel"`,
and the only such rule was `document.xsl:463`, `match="rdf:RDF"`. Nothing matched, and
the empty sequence failed the cardinality check.

Fixed and verified 2026-09-15 on both stacks: `GET /sparql?query=…` with a browser
`Accept` answers **200** with the results as an `ac-table`, with and without `&mode=`.
The bare `GET /sparql` still answers 400 "Query string not provided", which is what
the SPARQL protocol calls for — so there is no bare landing page, and
`user-guide/query-data.ttl:19-21` is describing the query form rather than an empty
one.

---

## 6. Document-scope Map mode draws Null Island when there is nothing to plot

**Severity** Low — cosmetic, but it reads as a broken map and costs real debugging time.

**Reproduce** Open `/territories/` and switch the **document's** layout mode (the
action-bar toggle, not the view block's) to Map.

**Observed** A world basemap centred on 0,0 — the Gulf of Guinea — with no markers.
Indistinguishable from a map that failed to load its data.

**Cause** Not a defect in the plotting path, and not a data problem. Measured:

| | |
|---|---|
| `geo:lat` in the `/territories/` container graph | **0** |
| `geo:lat` in the RDF the document serves | **0** |
| territory child resources carrying `geo:lat`/`geo:long` | **53** |

Document-scope Map renders the resources **the document describes**; a container
describes its children as links, not as geometry. The *view* block's Map mode renders
its query results and plots all 53 correctly. The coordinates themselves are plain
literals with no datatype, which is harmless — `converters/RDFXML2GeoJSON.xsl:48`
reads them with `xsl:value-of`, which takes the text value either way.

**Suggested fix** With zero features, either do not offer Map in the document-scope
menu, or render an empty state saying the document describes no geometry. Falling
back to centre 0,0 zoom 2 is the one outcome that looks like a bug.


## 7. A two-series chart labels its axis with the first series' name

**Severity** Low — the chart is readable, but the label on it is wrong.

**Reproduce**
1. Save a SELECT returning one literal axis variable and two aggregates, e.g.
   `?rep`, `(COUNT(…) AS ?territories)`, `(COUNT(…) AS ?orders)`.
2. From the query block's action bar, Create a Result set chart: Bar chart,
   Category `rep`, Series `territories` **and** `orders`.

**Observed** The bars are correct and both series render with a legend. The value axis
is titled **`territories`** while its scale runs 0–160, which is the range of `orders`
(max 156; `territories` maxes at 10). So the axis is named after the first series and
scaled to the second.

**Measured** on `/workload/`, the chart built by `01-who-carries-the-load`: axis title
`territories`, gridlines at 0, 20, … 160, `orders` reaching 156 for Peacock.

**Where to start** `client/block/chart.xsl`, the same data-table construction that
FINDINGS #3 is about. A single-series chart has one honest name for the axis; with two
there is none, so the axis title should be dropped rather than guessed — the legend
already names both.

---

## 8. `block-html` throws on a page carrying a proxied resource

**Severity** Low — twice per load, nothing visibly fails.

**Observed** Loading a ContentMode document that embeds a resource from another
dataspace through the proxy raises, twice:

```
Required cardinality of value in 'xsl:variable name="Q{}block-html"' expression is
exactly one; supplied value is empty
```

Seen on `/category-alignment/` once the UNESCO concept is embedded beside the local
category grid, alongside six `404 (Not Found)` resource loads on the same page. The
blocks render regardless, so this is noise hiding real errors rather than a failure —
the same category as the `[object DocumentFragment]` entry below, but this one does
correlate with a gesture, which makes it worth chasing first.

---

## 9. The chart pane selects every variable as a series, including the category

**Severity** Low — self-inflicted error message on a form that just opened.

**Reproduce**
1. Save a SELECT with a literal category and one or more aggregates.
2. Open its block's **Chart** tab.

**Observed** The Series multi-select arrives with **every** result variable selected,
the category among them. With `?city` and `?orders` that draws the city twice — a
Table with two identical columns. With `?rep`, `?territories` and `?orders` and a bar
chart it draws nothing and shows a red banner instead:

```
All series on a given axis must be of the same data type
```

The category is a string and the aggregates are integers, so the default selection is
guaranteed to be invalid the moment the chart type is anything but Table. Correcting
the Series makes it render; nothing else is wrong.

**Suggested fix** Default the Series to the variables that are *not* bound to the
Category — or to the numeric ones. The current default is never the one wanted.

**And it comes back after a successful save.** Creating a chart from the pane's own
Create button writes a correct resource — verified on `/workload/`:
`ldh:categoryVarName "rep"`, `ldh:seriesVarName "territories", "orders"`,
`ldh:chartType ac:BarChart`. The pane behind it then re-renders **back to the invalid
default**, so a successful action leaves a red error on screen. The configuration the
user just confirmed by saving is discarded rather than kept.

Even reading the pane as a scratch surface whose artifact is the saved chart, resetting
to a state that immediately errors is the wrong reset: the valid configuration is
inferable — numeric variables as series, the string one as category — and was just
demonstrated.

The block offers no tab to switch away to, so nothing in the UI dismisses it.

**Working around it on camera** `lib/constructors.mjs` `configureChart()` sets the chart
type first, then the category, then the series **last** — the reverse order looks right
and is worse, because changing the type re-renders the pane and resets the multi-select,
which saves the error into the chart. The selection is read back and re-applied once
rather than assumed.

---

## 10. A class without a constructor gets an empty Create form, and Save writes a nameless document

**Where** the `button.add-instance` on a derived inverse view (`client/block/view.xsl:493`),
on `/regions/4/` — "Cities in this region" — where the class is `schema:City`.

**What happens** The modal opens with the type chip ("Territory") and the add-property
combobox, and nothing else: the Northwind ontology defines a constructor for
`schema:Product` only. Save is enabled, and it creates a document under `/territories/`
holding one typed, nameless fragment resource — which then counts in the view ("Total
results 10" for eight territories) and, having no coordinates, plots nowhere.

**Expected** Either the form says the class has no constructor and offers to build one, or
Save is held back until the resource has at least a name — the ontology's own
`ldh:MissingPropertyValue` constraint exists for exactly this, and the shape it would check
against is what is missing.

**Worked around** the demo ontology gets a Territory constructor
(`demo/northwind-traders/admin/model/ns.ttl`, `:CityConstructor`), PATCHed into
`admin.northwind-traders…/ontologies/namespace/` as a single `INSERT … WHERE {}` and made
live with `ldh admin clear ontology` against the **admin** base (against the end-user base
`/clear` is 403); the two nameless documents were deleted. Three inverse views went in the
same way — `:ProductsInCategory`, `:EmployeesServingTerritory`, `:DirectReports` — so
category, territory and employee pages list what points at them.

---

## 11. A stack restart drops the dataspace's package imports

**Where** `linkeddatahub.com` compose stack; `ldh packages list -b https://northwind-traders…`.

**What happens** After `docker compose restart` the Taxonomy Editor package reads
`available` again, and a `packages add` issued while the entrypoint is still initialising is
overwritten by it: `/` answers 200 from the cache well before the settings are rewritten, so
"the stack is up" is not "the entrypoint is done". Re-adding after Tomcat's startup message
sticks.

**Cost** scene 04's `skos:exactMatch` typeahead comes up empty (the SKOS vocabulary
arrives only with the package), and the scene fails 105 s in.

---

## 12. Table mode promises sortable columns and its headers are labels

**Where** any view in Table mode — the layout switcher describes it as "Property values
in sortable columns"; seen on the derived "Products in this category" view on
`/categories/1/`.

**What happens** A header is `<th scope="col"><span title="https://schema.org/price">Price</span></th>`:
no control, no `aria-sort`, and clicking it changes nothing. Twelve beverages stay in
document order however many times Price is clicked.

**Expected** Either the headers sort — the toolbar already knows how to order a view — or
the mode description stops saying they do.

**Cost** scene 10 planned to sort the category's products by price to bring the dearest to
the top; it reads the column instead.

---

## 13. The create modal's add-property row fails for a resource property

**Where** the add-instance modal (`button.add-instance` on a derived view, e.g. Direct
reports on `/employees/2/` constructing a `schema:Person`), foot row `.ldh-prop-addrow`.

**What happens** Selecting `areaServed` (a resource property, `rdfs:range schema:City`)
and pressing Add shows "The form could not be loaded — the page ran into an unexpected
error" and adds no row. Selecting `type` in the same modal adds a row. The same select and
Add on the **edit** form of an existing Person (`/employees/7/`) adds an `areaServed` row
with a lookup combobox as expected.

**Expected** the create modal behaves like the edit form: one more lookup row.

**Cost** a hire with four territories cannot be made in one form; scene 02 assigns one in
the modal and the other three on the new record's edit form.

---

## 14. Create-from-view ends in two different places, and the view it came from does not refresh

**Where** `button.add-instance` on derived views: Cities in this region (`schema:City`),
Products in this category (`schema:Product`), Orders from this customer (`schema:Order`).

**What happens** Saving a City navigates to the new document. Saving a Product or an Order
closes the modal and leaves the page where it was — with the view still showing the old
count ("Total results 12" after the thirteenth product was created); the new row appears
only after the page is loaded again.

**Expected** one behaviour for all constructors, and the view that offered the Create
button re-reading itself after a successful save — that is the loop the button exists for.

**Cost** scenes 11 and 13 re-read their list by clicking the page's own title link; the
rig waits for either the navigation or the modal closing (`createFromView`).

---

## Not reproduced / not attributed

- **`Terminated with [object DocumentFragment]`** appears twice on essentially every
  page load, including loads with no interaction at all. It does not correlate with
  any gesture the scenes perform, and nothing visibly fails. Probably benign
  Saxon-JS template termination, but it is noise that hides real errors.

## Notes that are behaviour, not bugs

- **`details.ldh-pivot-bar` is collapsed by default.** Its pills report
  `visibility: visible`, `opacity: 1` and a 127×28 box, but `checkVisibility()` is
  `false` and Playwright counts none visible, because a closed `<details>` renders
  no content. A scene must click the `<summary>` first.
- **The first-time message modal blocks every click on a fresh browser profile**;
  its backdrop swallows pointer events. Seed the `LinkedDataHub.first-time-message`
  cookie (`client.xsl:216`, `modal.xsl:720`) instead of dismissing it on camera.
- **`:5443` resolves an app base without its port.** Passing the client-cert port as
  `--proxy` to an installer whose base carries `:4443` makes every write 400, since
  the document URIs then sit outside the app's base.
- **SKOS properties are not offered by the RDFa annotation typeahead until the
  Taxonomy Editor package is imported.** `ldh packages list` reports it as `available`
  rather than `installed` on a fresh Northwind, and with it missing the property
  combobox answers `exact` with nothing at all — not a slow lookup, an empty panel
  after 10s. `ldh packages add --package https://packages.linkeddatahub.com/editor/taxonomy/#this`
  restores it and takes effect without a restart. The vocabulary a dataspace offers is
  the vocabulary its packages bring, so a scene that annotates with `skos:exactMatch`
  depends on that import the way it depends on the data.
- **The app centres a ~1230 px content column**, so a 1920-wide capture is mostly
  empty gradient with small type. Scenes render at 1440×810.
