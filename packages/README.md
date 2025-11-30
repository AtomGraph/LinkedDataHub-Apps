# LinkedDataHub Packages

This directory contains reusable packages for LinkedDataHub dataspaces. Packages provide vocabulary support with custom ontologies and XSLT templates for rendering specific RDF vocabularies.

## Package Structure

Each package consists of:

```
packages/<package-name>/
├── package.ttl    # Package metadata (ldhp:Package resource)
├── ns.ttl         # Ontology with template blocks (ldh:template)
└── layout.xsl     # XSLT stylesheet with custom templates
```

### Example: SKOS Package

```
packages/skos/
├── package.ttl    # Metadata: https://packages.linkeddatahub.com/skos/#this
├── ns.ttl         # SKOS vocabulary with ldh:template blocks
└── layout.xsl     # XSLT templates for SKOS concepts, schemes, collections
```

## How Packages Work

### 1. Package Metadata (`package.ttl`)

Describes the package using standard LinkedDataHub properties:

```turtle
@prefix ldhp: <https://w3id.org/atomgraph/linkeddatahub/package#> .
@prefix ldt:  <https://www.w3.org/ns/ldt#> .
@prefix ac:   <https://w3id.org/atomgraph/client#> .

<https://packages.linkeddatahub.com/skos/#this> a ldhp:Package ;
    rdfs:label "SKOS Package" ;
    dct:description "SKOS vocabulary support with custom templates" ;
    ldt:ontology <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/ns.ttl> ;
    ac:stylesheet <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/layout.xsl> .
```

**Note**: Uses standard `ldt:ontology` and `ac:stylesheet` properties instead of inventing new ones.

### 2. Ontology (`ns.ttl`)

Contains two layers:

**A. RDF Vocabulary Classes and Properties**
```turtle
skos:Concept a owl:Class ;
    rdfs:label "Concept" .

skos:narrower a owl:ObjectProperty ;
    rdfs:label "has narrower" .
```

**B. Template Blocks (ldh:template)**

SPARQL-based views attached to RDF types:

```turtle
skos:Concept ldh:template ns:NarrowerConcepts .

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

### 3. XSLT Stylesheet (`layout.xsl`)

XSLT templates using `bs2:*` modes to override default rendering:

```xsl
<!-- Hide properties from default property list -->
<xsl:template match="skos:narrower | skos:broader" mode="bs2:PropertyList"/>

<!-- Custom row rendering for concepts -->
<xsl:template match="*[rdf:type/@rdf:resource = '&skos;Concept']" mode="bs2:Row">
    <!-- Custom HTML rendering -->
</xsl:template>
```

## Installing Packages

### Method 1: CLI Script

```bash
install-package.sh \
  -b https://localhost:4443/ \
  -f ssl/owner/cert.pem \
  -p Password \
  --package https://packages.linkeddatahub.com/skos/#this
```

### Method 2: From Application Install Script

```bash
# In LinkedDataHub-Apps/demo/skos/install.sh
install-package.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --package "https://packages.linkeddatahub.com/skos/#this"
```

## Prerequisites

Before installing packages, a **master stylesheet** must exist at `/static/<hostname>/layout.xsl` in the webapp directory. A default template is provided at:

```
src/main/webapp/static/localhost/layout.xsl
```

This file should be deployed with the application. It contains:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs">

    <!-- System stylesheet (lowest priority) -->
    <xsl:import href="../com/atomgraph/linkeddatahub/xsl/bootstrap/2.3.2/layout.xsl"/>

    <!-- Package stylesheets will be added here by InstallPackage endpoint -->

</xsl:stylesheet>
```

## What Installation Does

When you install a package, the system:

1. **Fetches package metadata** from the package URI
2. **Downloads package ontology** (`ns.ttl`) and POSTs it to the namespace graph (`${admin_base}ontologies/namespace/`)
3. **Downloads package stylesheet** (`layout.xsl`) and saves it to `/static/packages/<package-name>/layout.xsl`
4. **Updates master stylesheet** at `/static/<hostname>/layout.xsl` by adding import:
   ```xml
   <xsl:import href="../com/atomgraph/linkeddatahub/xsl/bootstrap/2.3.2/layout.xsl"/>  <!-- System -->
   <xsl:import href="../packages/skos/layout.xsl"/>  <!-- Package (added) -->
   ```
5. **Adds import to application** (currently manual): `<app> ldh:import <package-uri>`

**Note**: The master stylesheet must already exist or installation will fail with `InternalServerErrorException`.

## Architecture

### Installation-Time vs Runtime

Packages use **installation-time composition**, NOT runtime composition:

- ✅ Package content is integrated during installation (via JAX-RS endpoints)
- ✅ Ontology and XSLT are pre-composed before being loaded
- ✅ No runtime overhead
- ❌ No dynamic package loading at request time

### JAX-RS Endpoints

- **POST `/admin/install-package`** - Installs a package
  - Parameter: `packageUri` (form-urlencoded)
  - Requires admin authentication

- **POST `/admin/uninstall-package`** - Uninstalls a package
  - Parameter: `packageUri` (form-urlencoded)
  - Requires admin authentication

### File System Structure

After installation:

```
webapp/
├── static/
│   ├── packages/
│   │   └── skos/
│   │       └── layout.xsl          # Package stylesheet
│   └── localhost/
│       └── layout.xsl               # Generated master stylesheet
```

### SPARQL Data Structure

```turtle
# In system.trig (application config)
<urn:linkeddatahub:apps/skos> a lapp:Application ;
    ldt:ontology <https://localhost:4443/skos/ns#> ;
    ac:stylesheet <static/localhost/layout.xsl> ;  # Master stylesheet
    ldh:import <https://packages.linkeddatahub.com/skos/#this> .

# In admin SPARQL endpoint (namespace graph)
# Contains merged package ontologies via owl:imports
```

## Available Packages

- **skos** - SKOS vocabulary support (concepts, schemes, collections)

## Creating New Packages

1. Create directory: `packages/<name>/`
2. Write `package.ttl` with metadata
3. Write `ns.ttl` with vocabulary and template blocks
4. Write `layout.xsl` with XSLT templates (using `bs2:*` modes)
5. Publish as Linked Data at `https://packages.linkeddatahub.com/<name>/#this`

## Vocabulary Reference

### LDHP Vocabulary (`https://w3id.org/atomgraph/linkeddatahub/package#`)

- `ldhp:Package` - Package class

### Standard Properties (Reused)

- `ldt:ontology` - Points to package ontology URI (from LDT vocabulary)
- `ac:stylesheet` - Points to package stylesheet URI (from AtomGraph Client vocabulary)
- `ldh:import` - Application property linking to imported packages (from LDH vocabulary)

## Notes

- Packages are **declarative only** (RDF + XSLT, no Java code)
- Package ontologies use `owl:imports` (handled automatically by Jena)
- Package stylesheets use `xsl:import` (handled by master stylesheet generation)
- Template blocks (`ldh:template`) are separate from XSLT overrides
- Both mechanisms work independently and complement each other
