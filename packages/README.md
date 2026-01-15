# LinkedDataHub Packages

This directory contains reusable packages for LinkedDataHub dataspaces. Packages provide vocabulary support with custom ontologies and XSLT templates for rendering specific RDF vocabularies.

## Package Structure

Each package consists of:

```
packages/<package-name>/
├── ns.ttl         # Ontology with template blocks (ldh:template)
└── layout.xsl     # XSLT stylesheet with custom templates
```

Package metadata is Linked Data that resolves from the package URI (e.g., `https://packages.linkeddatahub.com/skos/#this`).

### Example: SKOS Package

```
packages/skos/
├── ns.ttl         # SKOS vocabulary with ldh:template blocks
└── layout.xsl     # XSLT templates for SKOS concepts, schemes, collections
```

Metadata for this package resolves from `https://packages.linkeddatahub.com/skos/#this`.

## How Packages Work

### 1. Package Metadata

Package metadata resolves as Linked Data from the package URI using standard LinkedDataHub properties:

```turtle
@prefix lapp: <https://w3id.org/atomgraph/linkeddatahub/apps#> .
@prefix ldt:  <https://www.w3.org/ns/ldt#> .
@prefix ac:   <https://w3id.org/atomgraph/client#> .

<https://packages.linkeddatahub.com/skos/#this> a lapp:Package ;
    rdfs:label "SKOS Package" ;
    dct:description "SKOS vocabulary support with custom templates" ;
    ldt:ontology <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/ns.ttl#> ;
    ac:stylesheet <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/layout.xsl> .
```

**Note**: Uses standard `ldt:ontology` and `ac:stylesheet` properties instead of inventing new ones.

### 2. Ontology (`ns.ttl`)

Contains two layers:

**A. Vocabulary Import**

Imports the external vocabulary using `owl:imports`:

```turtle
<https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/ns.ttl#> a owl:Ontology ;
    owl:imports <http://www.w3.org/2004/02/skos/core> .
```

**B. Template Blocks (ldh:template)**

SPARQL-based views attached to RDF types from the imported vocabulary:

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

XSLT templates using system modes to override default rendering:

```xsl
<!-- Hide properties from default property list -->
<xsl:template match="skos:narrower | skos:broader" mode="bs2:PropertyList"/>

<!-- Override XHTML head elements -->
<xsl:template match="*" mode="xhtml:Style">
    <!-- Custom styles -->
</xsl:template>
```

Available system modes include `bs2:*` (Bootstrap 2.3.2 components), `xhtml:*` (XHTML elements), and others.

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

Before installing packages, **master stylesheets** must exist in the webapp directory:

- `/static/xsl/layout.xsl` - End-user application master stylesheet
- `/static/xsl/admin/layout.xsl` - Admin application master stylesheet

Default templates are provided at:

```
src/main/webapp/static/xsl/layout.xsl
src/main/webapp/static/xsl/admin/layout.xsl
```

These files should be deployed with the application. End-user stylesheet contains:

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
2. **Hashes the package ontology URI** using SHA-1 to create a unique document slug
3. **Downloads package ontology** (`ns.ttl`) and PUTs it as a document to `${admin_base}ontologies/{hash}/` where `{hash}` is the SHA-1 hash of the ontology URI
4. **Adds owl:imports** from the namespace ontology to the package ontology in the namespace graph (`${admin_base}ontologies/namespace/`)
5. **Clears and reloads** the namespace ontology from cache to pick up the new imports
6. **Downloads package stylesheet** (`layout.xsl`) and saves it to `/static/{package-path}/layout.xsl` where `{package-path}` is derived from the package URI (e.g., `com/linkeddatahub/packages/skos/` for `https://packages.linkeddatahub.com/skos/`)
7. **Updates master stylesheet** at `/static/xsl/layout.xsl` by adding import:
   ```xml
   <xsl:import href="../com/atomgraph/linkeddatahub/xsl/bootstrap/2.3.2/layout.xsl"/>  <!-- System -->
   <xsl:import href="../com/linkeddatahub/packages/skos/layout.xsl"/>  <!-- Package (added) -->
   ```
8. **Adds import to application** (TODO - currently manual): `<app> ldh:import <package-uri>`

**Note**: The master stylesheet must already exist or installation will fail with `InternalServerErrorException`.

## Architecture

### Installation-Time vs Runtime

Packages use **installation-time composition**, NOT runtime composition:

- ✅ Package content is integrated during installation (via JAX-RS endpoints)
- ✅ Ontology and XSLT are pre-composed before being loaded
- ✅ No runtime overhead
- ❌ No dynamic package loading at request time

### JAX-RS Endpoints

**On the admin application**

- **POST `/packages/install`** - Installs a package
  - Parameter: `package-uri` (form-urlencoded)
  - Requires owner/admin authentication
  - Delegates authenticated agent credentials for PUT requests

- **POST `/packages/uninstall`** - Uninstalls a package
  - Parameter: `package-uri` (form-urlencoded)
  - Requires owner/admin authentication

### File System Structure

After installing the SKOS package:

```
webapp/
├── static/
│   ├── com/
│   │   └── linkeddatahub/
│   │       └── packages/
│   │           └── skos/
│   │               └── layout.xsl          # Package stylesheet
│   └── xsl/
│       ├── layout.xsl                      # End-user master stylesheet
│       └── admin/
│           └── layout.xsl                  # Admin master stylesheet
```

### SPARQL Data Structure

```turtle
# In admin SPARQL endpoint at <${admin_base}ontologies/{hash}/>
# Package ontology stored as a document where {hash} is SHA-1 of ontology URI
<https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/ns.ttl#> a owl:Ontology ;
    # ... package ontology content ...

# In admin SPARQL endpoint (namespace graph at <${admin_base}ontologies/namespace/>)
# Namespace ontology imports package ontology
<https://localhost:4443/ns#> a owl:Ontology ;
    owl:imports <https://raw.githubusercontent.com/AtomGraph/LinkedDataHub-Apps/master/packages/skos/ns.ttl#> .

# In system.trig (application config)
<urn:linkeddatahub:apps/end-user> a lapp:EndUserApplication ;
    ldt:ontology <https://localhost:4443/ns#> ;
    ac:stylesheet <static/xsl/layout.xsl> ;  # Master stylesheet
```

## Available Packages

List of available packagcan be found in the [LinkedDataHub-Apps](https://github.com/AtomGraph/LinkedDataHub-Apps/tree/develop/packages) repository.

## Creating New Packages

1. Create directory: `packages/<name>/`
2. Write `ns.ttl` with vocabulary and template blocks
3. Write `layout.xsl` with XSLT templates (using system modes like `bs2:*`, `xhtml:*`, etc.)
4. Publish package metadata as Linked Data at `https://packages.linkeddatahub.com/<name>/#this`
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
- Package stylesheets use `xsl:import` (handled by master stylesheet generation)
- Template blocks (`ldh:template`) are separate from XSLT overrides
- Both mechanisms work independently and complement each other
