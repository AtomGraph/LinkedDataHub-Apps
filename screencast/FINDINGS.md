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
- **The app centres a ~1230 px content column**, so a 1920-wide capture is mostly
  empty gradient with small type. Scenes render at 1440×810.
