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
needs. A package folder holds one `.xsl` file, and `install.sh` makes it the package's `ac:stylesheet`;
its name is not a convention.

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

Package metadata resolves as Linked Data from the package URI using standard LinkedDataHub properties.
The descriptor is the `foaf:primaryTopic` of the package's own document, `packages/editor/taxonomy.ttl`,
which `ldh push` PUTs to `https://packages.linkeddatahub.com/editor/taxonomy/`:

```turtle
@prefix lds:  <https://w3id.org/atomgraph/linkeddatahub/dataspaces#> .
@prefix dct:  <http://purl.org/dc/terms/> .

<#this> a lds:Package ;
    dct:title "Taxonomy Editor" ;
    dct:description "Turns a dataspace into a taxonomy editor: ..." ;
    lds:ontology <ns/#> .
```

`lds:ontology <ns/#>` is registry-relative: the same push PUTs `ns.ttl` as the `ns/` document beside the
descriptor, so the ontology is served by the registry itself. It names the ontology IRI that `ns.ttl`
declares (`<#>` resolved against the `ns/` document), not the document URL: the imports closure keys
graphs by ontology IRI, and a descriptor naming the document loads it a second time under the IRI,
which fails with "Another graph with name ... is already in the hierarchy".

The descriptor in this repository has no `ac:stylesheet`. The push uploads the package's `.xsl` file into
the package document as `text/xsl`, and `install.sh` then adds the reference to that upload, whose URI it
computes from the same file:

```turtle
<https://packages.linkeddatahub.com/editor/taxonomy/#this>
    ac:stylesheet <https://packages.linkeddatahub.com/uploads/01db8c939f6841c397c0e4eda60a863318ca5126> .
```

An upload's URI is the SHA-1 of its content, so the published reference names exactly the stylesheet
that was published with it, and a changed stylesheet gets a new URI rather than changing under the
dataspaces that already copied it (see [What the Declaration Does](#what-the-declaration-does)).

**Note**: Uses standard `lds:ontology` and `ac:stylesheet` properties instead of inventing new ones.

### 2. Ontology (`ns.ttl`)

Contains two layers:

**A. Vocabulary Import**

Imports the external vocabulary using `owl:imports`:

```turtle
@prefix : <#> .   # resolves against the ns/ document the registry serves it as

: a owl:Ontology ;
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
| `ac:FormControl` | one property's form control, or one value's | replaces the generic control for the package's property or datatype, or decorates it with `xsl:next-match` |
| `ac:PropertyListValue` | one value cell in the property list | replaces or decorates |
| `ac:ValueAnnotations` | the term-kind / datatype / language chip beside a value | replaces or decorates |
| `ldh:TypeControl`, `ac:property-label`, `ac:object-label`, the unnamed mode | the property row and how a value is labelled and linked | replaces or decorates |

`hooks.xsl` in the platform sources carries the same table beside the declarations; the value leaves are
in `imports/values.xsl`, which it imports. The platform's own vocabulary modules (`imports/rdf.xsl`,
`imports/dct.xsl`...) sit above the packages, so a package specialises core's *generic* rendering and
cannot contradict how core renders its own terms. The component modes (`ldh:Modal`, `ac:FieldShell`...),
the `ldh:Combobox` widget and the library in `imports/default.xsl` (keys, params, functions) are sealed.

## Installing Packages

The declaration *is* the installation. A dataspace imports a package by carrying a single
`ldh:import` triple in its settings, and the `packages` CLI group reads the registry and writes that
triple:

```bash
ldh packages list
ldh packages add --package https://packages.linkeddatahub.com/editor/taxonomy/#this
ldh packages remove --package https://packages.linkeddatahub.com/editor/taxonomy/#this
```

`packages list` prints one tab-separated line per package — state, URI, title. The registry defaults
to `https://packages.linkeddatahub.com/`; `--registry` overrides it. It is read through the
dataspace's Linked Data proxy rather than fetched directly, so `list` needs `--base` as much as
the other two do.

The dataspace settings modal offers the same thing as a checkbox per package, saved with the rest
of the settings in one `PATCH`.

Both paths go through `PATCH /settings`, which is the live route: the change takes effect on the
next request, and lives in the running dataspace's context dataset. Declaring the same triple in
`config/dataspaces.trig` is the permanent one, applied on restart.

```turtle
<urn:linkeddatahub:apps/end-user> ldh:import <https://packages.linkeddatahub.com/editor/taxonomy/#this> .
```

## What the Declaration Does

From the next request onwards, the server resolves it:

1. **Resolves the package description** from the package URI. Cached graphs
   come from the graph repository; other URIs are dereferenced over HTTP.
2. **Materializes the package ontology** (`lds:ontology`) as a document under the admin dataspace's
   `ontologies/` container, named after the package path — `ontologies/editor-taxonomy/` for the
   taxonomy editor. The ontology is copied verbatim, once; the document names it as its
   `foaf:primaryTopic` and is skipped on later requests.
3. **Adds that document** to the dataspace's ontology imports closure, as an `owl:imports` of the
   namespace ontology. Its classes, constructors, constraints and views become available on the `ns`
   endpoint and in the UI, and are edited there like the namespace ontology's own.
4. **Copies the package stylesheet** (`ac:stylesheet`) once under the platform's package root and
   serves it from the dataspace's own origin under `/static/com/linkeddatahub/packages/`, so what
   the instance compiles cannot change under it.
5. **Composes that copy** into the dataspace stylesheet by inserting an `xsl:import` right after
   the platform's `hooks.xsl` import, so package templates override the open modes' fallbacks and
   nothing else (see the stylesheet section above). The client-side stylesheet is composed the same
   way and compiled by the `sef-compiler`.

Packages are applied in the order of their URIs. One that declares only an ontology, or only a
stylesheet, contributes only that; one whose description cannot be resolved is skipped. If the
composed stylesheet fails to compile — an unreachable stylesheet URL, say — the dataspace falls
back to its own.

**Both copies are taken at import and kept.** No restart is needed, but a change to the published
package reaches a dataspace that already imported it only after the materialized ontology document is
deleted (the next request materializes it again) and the ontology cache is cleared.

Uninstalling is the same in reverse: retract the triple, and from the next request the ontology is
out of the closure and the stylesheet is no longer composed in. Data created with the package's
vocabulary stays in the dataspace, and may not display or validate correctly without it.
## Available Packages

| Package | URI | Provides |
|---|---|---|
| [`editor/taxonomy`](editor/taxonomy/) | `https://packages.linkeddatahub.com/editor/taxonomy/#this` | SKOS constructors, constraints, hierarchy views and a concept tree. Used by [`demo/unesco-thesaurus`](../demo/unesco-thesaurus/). |

`ldh packages list` prints the registry's current contents.

## Creating New Packages

1. Create directory: `packages/<path>/`, naming it for what the package does
2. Write `ns.ttl` with vocabulary and property views (using `ldh:view` or `ldh:inverseView`)
3. Write the stylesheet with XSLT templates (using system modes like `ac:*`, `ldh:*`, `xhtml:*`, etc.), naming the file for the vocabulary it covers; it is the only `.xsl` file in the folder
4. Describe the package in `packages/<path>.ttl` as `<#this>`, the `foaf:primaryTopic` of the document, with an `lds:ontology`
   naming the ontology IRI `ns.ttl` declares; leave `ac:stylesheet` out, `install.sh` adds it
5. List the package in the catalog, `root.ttl`, as an `rdfs:member` of the registry root with the same
   `dct:title` and `dct:description` as its descriptor: the settings modal and `ldh packages list` read
   the catalog, not the descriptors

## Vocabulary Reference

### LDS Vocabulary (`https://w3id.org/atomgraph/linkeddatahub/dataspaces#`)

- `lds:Package` - Package class
- `lds:ontology` - Points to package ontology URI

### Standard Properties (Reused)

- `ac:stylesheet` - Points to package stylesheet URI (from AtomGraph Client vocabulary)

## Notes

- Packages are **declarative only** (RDF + XSLT, no Java code)
- Package ontologies use `owl:imports` (handled automatically by Jena)
- Package ontologies are materialized as editable documents under the admin `ontologies/` container, and package stylesheets are copied under `/static/com/linkeddatahub/packages/`, both once at import
- Package stylesheets are composed into the dataspace stylesheet with `xsl:import` at the `hooks.xsl` marker, per dataspace
- Property views (`ldh:view`/`ldh:inverseView`) are separate from XSLT overrides
- Both mechanisms work independently and complement each other
