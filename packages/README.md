# LinkedDataHub Packages

This directory contains reusable packages for LinkedDataHub dataspaces. Packages provide vocabulary support with custom ontologies and XSLT templates for rendering specific RDF vocabularies.

> **Version:** Packages were introduced in LinkedDataHub 5.2.

## Package Structure

Each package consists of:

```
packages/<package-path>/
├── ns.ttl         # Ontology with property views (ldh:view/ldh:inverseView)
└── <name>.xsl     # XSLT stylesheet with custom templates
```

The directory path is the package URI: a package under `packages/a/b/` is published at
`https://packages.linkeddatahub.com/a/b/`, so a path may carry as many segments as the grouping
needs. The stylesheet filename is not a convention — it is whatever the package's `ac:stylesheet`
names.

Package metadata is Linked Data that resolves from the package URI (e.g., `https://packages.linkeddatahub.com/editor/taxonomy/#this`).

### Example: the taxonomy editor package

```
packages/editor/taxonomy/
├── ns.ttl         # SKOS vocabulary with ldh:view attachments to properties
└── skos.xsl       # XSLT templates for SKOS concepts, schemes, collections
```

Metadata for this package resolves from `https://packages.linkeddatahub.com/editor/taxonomy/#this`.
The package is named for what it does; its stylesheet is named for the vocabulary it speaks.

## How Packages Work

### 1. Package Metadata

Package metadata resolves as Linked Data from the package URI using standard LinkedDataHub properties:

```turtle
@prefix lapp: <https://w3id.org/atomgraph/linkeddatahub/apps#> .
@prefix ldt:  <https://www.w3.org/ns/ldt#> .
@prefix ac:   <https://w3id.org/atomgraph/client#> .

<https://packages.linkeddatahub.com/editor/taxonomy/#this> a lapp:Package ;
    rdfs:label "Taxonomy Editor" ;
    dct:description "Taxonomy editing on SKOS, with custom templates" ;
    ldt:ontology <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/editor/taxonomy/ns.ttl#> ;
    ac:stylesheet <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/editor/taxonomy/skos.xsl> .
```

**Note**: Uses standard `ldt:ontology` and `ac:stylesheet` properties instead of inventing new ones.

### 2. Ontology (`ns.ttl`)

Contains two layers:

**A. Vocabulary Import**

Imports the external vocabulary using `owl:imports`:

```turtle
<https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/editor/taxonomy/ns.ttl#> a owl:Ontology ;
    owl:imports <http://www.w3.org/2004/02/skos/core> .
```

**B. Property Views (ldh:view/ldh:inverseView)**

SPARQL-based views attached to properties from the imported vocabulary:

```turtle
skos:narrower ldh:view ns:NarrowerConcepts .

ns:NarrowerConcepts a ldh:View ;
    dct:title "Narrower concepts" ;
    spin:query ns:SelectNarrowerConcepts .

ns:SelectNarrowerConcepts a sp:Select ;
    sp:text """
    SELECT DISTINCT ?narrower
    WHERE { GRAPH ?graph { $about skos:narrower ?narrower } }
    ORDER BY ?narrower
    """ .
```

Use `ldh:view` for forward relationships (resource has property) or `ldh:inverseView` for inverse relationships (other resources point to this resource via property).

### 3. XSLT Stylesheet (named by `ac:stylesheet`)

XSLT template rules in the platform's **open modes**:

```xsl
<!-- Hide the hierarchy predicates from the property list: the concept tree shows them -->
<xsl:template match="skos:narrower | skos:broader" mode="ac:PropertyEditor"/>

<!-- Render a concept's tree node as expandable, keeping the platform's markup -->
<xsl:template match="*[@rdf:about][rdf:type/@rdf:resource = '&skos;Concept']" mode="ldh:TreeNode" priority="1">
    <xsl:next-match>
        <xsl:with-param name="expandable" select="true()"/>
    </xsl:next-match>
</xsl:template>
```

The package stylesheet is composed into the platform's import tree right above `hooks.xsl`, the module
that declares the open modes and their generic fallbacks, and below everything else. Import precedence
beats template priority, so that position is the contract: a package rule outranks a fallback in an open
mode whatever the priorities, and loses to any rule in a sealed mode whatever its own priority. A package
cannot replace the page head, the content body, a typed rule or a global - those are sealed by
precedence, not by policy.

An open mode is a leaf: it renders or contributes for one node and carries no control flow. The open
modes, with what a rule in each one owes:

| Mode | What it renders | A package rule |
|---|---|---|
| `ldh:TreeNode` | one tree node | replaces the fallback, or decorates it with `xsl:next-match` |
| `ac:PropertyEditor` | one resource's property list, or one statement row | replaces or decorates; an empty rule hides |
| `ldh:ContentColumn` | the navigation slot beside the content body | fills it; nothing to inherit |
| `ldh:TreeChildrenLoad` | (client) the children fetch for one tree node | replaces |
| `ldh:RowHook` | (client) factories of deferred work for one rendered row | contributes; nothing to inherit |

`hooks.xsl` in the platform sources carries the same table beside the declarations. The value-leaf modes
(`ac:FormControl`, `ac:PropertyListValue`, the unnamed mode) and the component modes (`ldh:Modal`,
`ac:FieldShell`...) are sealed in this version.

## Installing Packages

The declaration *is* the installation. An application imports a package by carrying a single
`ldh:import` triple in its settings, and the `packages` CLI group reads the registry and writes that
triple:

```bash
ldh packages list
ldh packages add --package https://packages.linkeddatahub.com/editor/taxonomy/#this
ldh packages remove --package https://packages.linkeddatahub.com/editor/taxonomy/#this
```

`packages list` prints one tab-separated line per package — state, URI, title. The registry defaults
to `https://packages.linkeddatahub.com/`; `--registry` overrides it. It is read through the
application's Linked Data proxy rather than fetched directly, so `list` needs `--base` as much as
the other two do.

The application settings modal offers the same thing as a checkbox per package, saved with the rest
of the settings in one `PATCH`.

Both paths go through `PATCH /settings`, which is the live route: the change takes effect on the
next request, and lives in the running application's context dataset. Declaring the same triple in
`config/dataspaces.trig` is the permanent one, applied on restart.

```turtle
<urn:linkeddatahub:apps/end-user> ldh:import <https://packages.linkeddatahub.com/editor/taxonomy/#this> .
```

## What the Declaration Does

From the next request onwards, the server resolves it:

1. **Resolves the package description** from the package URI. Bundled descriptions and cached graphs
   come from the graph repository; other URIs are dereferenced over HTTP.
2. **Adds the package ontology** (`ldt:ontology`) to the application's ontology imports closure, as
   an `owl:imports` of the namespace ontology. Its classes, constructors, constraints and views
   become available on the `ns` endpoint and in the UI.
3. **Composes the package stylesheet** (`ac:stylesheet`) into the application stylesheet by
   inserting an `xsl:import` right after the platform's `hooks.xsl` import, so package templates
   override the open modes' fallbacks and nothing else (see the stylesheet section above).

Packages are applied in the order of their URIs. One that declares only an ontology, or only a
stylesheet, contributes only that; one whose description cannot be resolved is skipped. If the
composed stylesheet fails to compile — an unreachable stylesheet URL, say — the application falls
back to its own.

**Nothing is copied into the webapp and `/static/` is never modified.** No restart is needed.

Uninstalling is the same in reverse: retract the triple, and from the next request the ontology is
out of the closure and the stylesheet is no longer composed in. Data created with the package's
vocabulary stays in the dataspace, and may not display or validate correctly without it.
## Available Packages

List of available packages can be found in the [LinkedDataHub-Apps](https://github.com/AtomGraph/LinkedDataHub-Apps/tree/develop/packages) repository.

## Creating New Packages

1. Create directory: `packages/<path>/`, naming it for what the package does
2. Write `ns.ttl` with vocabulary and property views (using `ldh:view` or `ldh:inverseView`)
3. Write the stylesheet with XSLT templates (using system modes like `ac:*`, `ldh:*`, `xhtml:*`, etc.), naming the file for the vocabulary it covers
4. Publish package metadata as Linked Data at `https://packages.linkeddatahub.com/<path>/#this`
5. Ensure the metadata contains `ldt:ontology` and `ac:stylesheet` properties pointing to the package resources

## Vocabulary Reference

### LAPP Vocabulary (`https://w3id.org/atomgraph/linkeddatahub/apps#`)

- `lapp:Package` - Package class

### Standard Properties (Reused)

- `ldt:ontology` - Points to package ontology URI (from LDT vocabulary)
- `ac:stylesheet` - Points to package stylesheet URI (from AtomGraph Client vocabulary)

## Notes

- Packages are **declarative only** (RDF + XSLT, no Java code)
- Package ontologies use `owl:imports` (handled automatically by Jena)
- Package stylesheets are composed into the application stylesheet with `xsl:import` at the `hooks.xsl` marker, in memory, per dataspace
- Property views (`ldh:view`/`ldh:inverseView`) are separate from XSLT overrides
- Both mechanisms work independently and complement each other
