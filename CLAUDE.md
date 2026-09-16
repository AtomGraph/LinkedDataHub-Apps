# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

LinkedDataHub-Apps is a collection of data-driven applications built on LinkedDataHub. The repository contains system, demo, and user-submitted applications that are completely data-driven with no imperative code - only shell scripts for installation and SPARQL queries for data processing.

## Repository Structure

- `/linkeddatahub/docs/` - Documentation for LinkedDataHub open-source and Cloud versions
- `/demo/northwind-traders/` - Knowledge Graph representation of Northwind Traders sample database with faceted search
- `/demo/city-graph/` - Geospatial browser for Copenhagen open data with type-colored geospatial overview
- `/demo/skos/` - Basic SKOS editor with custom UI theme for concept and schema management

Each demo application includes:
- Installation shell scripts
- SPARQL queries for data import and processing
- CSV data files (for data import)
- Custom ontologies and constraints (stored as .ttl files)
- Optional custom XSLT stylesheets and CSS

## Common Commands

### Installation
Applications use interactive Makefiles for installation:
```bash
make install    # Interactive installation with prompts for BASE_URL, CERT_PATH, PASSWORD, PROXY_URL
```

### Documentation (linkeddatahub/docs/)
```bash
make validate          # Validate documents
make ttl-to-html      # Convert Turtle files to HTML
```

### Documentation media (screencast/)

Screenshots and clips for the docs are produced by a scripted Playwright rig, never taken by hand.

```bash
cd screencast
node docs/shoot.mjs --base … --cert-file … --cert-password-file … [--only reference]
make docs-publish   # optimise docs/out/ into ../docs/, printing sha1 per published file
```

- `docs/manifest.mjs` is the shot list — one entry per `div.screenshot-placeholder` in the `.ttl` sources, bound to its file, line and caption verbatim. New slots go there, not in the runner.
- Each entry's `want` is asserted after `act` and before the capture, so a shot that never reached its state is reported missed rather than written.
- `blocked` slots stay as placeholders with their reason recorded. Do not fill one by hand.
- The shoot writes **masters** — 2880px lossless PNG, a `.webm` and an `.mp4` per clip — into `docs/out/`, plus an `index.json` of slot, caption, file and outcome. It never edits a `.ttl`.
- `make docs-publish` derives the web assets into `docs/`: stills to WebP at 2240px (twice the docs' content column), `.mp4`s copied since they already carry CRF 20 / `yuv420p` / faststart, `.webm`s dropped.

**Optimise before hashing.** Uploads are content-addressed at `{base}uploads/{sha1}`, so a reference is only valid for the bytes that ship — never hash a master.

References are document-relative, one `../` per path segment of the page, and live inside `rdf:XMLLiteral` bodies that must stay canonical (attributes alphabetical, explicit end tags, each start tag on one line):

```xml
<img alt="The document tree with a container expanded" src="../../uploads/{sha1}"></img>
<video aria-label="Browsing and navigating data" controls="controls" preload="metadata" src="../../uploads/{sha1}"></video>
```

A clip is a `<video>`, never an `<object>`. `Item.java` serves every upload with `Content-Security-Policy: default-src 'none'; sandbox` (the LNK-011 stored-XSS fix). An `<object>` loads the file as a nested *document*, so that CSP governs the document's own media load and Chrome blocks it — Firefox does not, which makes the breakage look browser-specific when it is not. A `<video>` is a subresource of the page, governed by the page's CSP, and loads normally. Images are unaffected for the same reason.

Shipping them needs no script change: `docs/update-folder.sh` already uploads every non-`.ttl`/`.sh` file in a folder to that folder's container, and `ttl-to-html.xsl` rewrites `uploads/{sha1}` to `files/{name}` for the static build, terminating on a hash it cannot find — so a clean `make ttl-to-html` proves every baked hash resolves.

### Prerequisites
All installation scripts require LinkedDataHub CLI scripts in PATH:
```bash
export PATH="$(find bin -type d -exec realpath {} \; | tr '\n' ':')$PATH"
```

## Application Architecture

### Data-Driven Approach
- **Zero imperative code** - applications are entirely configuration-driven
- **SPARQL-based processing** - all data transformations use SPARQL queries
- **RDF/Turtle ontologies** - define application structure and constraints
- **Shell script orchestration** - only for installation and deployment tasks

### Key Components per Application
1. **Installation scripts** (`install.sh`) - Deploy application to LinkedDataHub instance
2. **Data import scripts** (`import-csv.sh`, `import-rdf.sh`) - Load data from CSV/RDF sources
3. **SPARQL queries** (`queries/` directory) - Define data processing and views
4. **Ontology files** (`admin/model/*.ttl`) - Define classes, properties, and constraints
5. **Configuration scripts** - Create containers, charts, and authorizations

### Application Flow
1. Install ontologies and model definitions
2. Create containers and authorization structures
3. Import data from CSV/RDF sources using SPARQL transformation queries
4. Create charts and views for data visualization
5. Configure access control and permissions

### Custom Styling (SKOS demo)
Some applications like SKOS use custom XSLT stylesheets and CSS that need to be mounted in LinkedDataHub configuration and require increased payload size limits.

## Important Notes

- **Installation scripts are NOT idempotent** - subsequent runs may add data but aren't guaranteed to succeed
- **Special characters in passwords** need to be escaped in shell scripts
- **Custom stylesheets** require LinkedDataHub configuration changes and Docker volume mounts
- **Access control** - some applications require requesting append/write access to create/edit data

## File Types and Conventions

- `.ttl` - Turtle RDF files for ontologies and data
- `.rq` - SPARQL query files
- `.csv` - Data import files
- `.sh` - Shell scripts for installation and deployment
- `.webp` / `.mp4` - Documentation screenshots and clips, published by `make docs-publish`
- `Makefile` - Interactive installation and build targets