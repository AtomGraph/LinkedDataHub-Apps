# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

LinkedDataHub-Apps holds dataspaces built on LinkedDataHub. Every app is a tree of RDF documents plus the files they carry, installed with the `ldh` CLI. There is no imperative code: behaviour lives in RDF (Turtle), SPARQL and XSLT, and shell only orchestrates CLI calls.

- `docs/` — the LinkedDataHub documentation, itself a LinkedDataHub app, published live at https://docs.linkeddatahub.com/ and as a static site under https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/
- `demo/northwind-traders/` — Northwind Traders as a knowledge graph: faceted search, parallax navigation, CSV import, a 969-line namespace ontology with constructors, constraints and views
- `demo/copenhagen/` — Copenhagen open data on a map, imported from CSV
- `demo/unesco-thesaurus/` — the UNESCO Thesaurus as a SKOS editor; its model and stylesheet come from the taxonomy editor package
- `packages/` — the package registry published at https://packages.linkeddatahub.com/; one package so far, `editor/taxonomy`
- `lib/` — the shared installer: `install.mk` (the interactive `make install`) and `ldh-app.sh` (functions every `install.sh` sources)
- `screencast/` — the Playwright rig that produces the docs' screenshots and clips, and the Northwind screencast tracks
- `check-links.sh`, `check-xmlliterals.sh` — repository-wide validators, run by CI

## Prerequisites

The `ldh` CLI, built from a LinkedDataHub checkout and put on `PATH`:

```bash
cd ../LinkedDataHub/cli && mvn package && export PATH="$PWD/bin:$PATH"
```

The docs build additionally needs `riot` (Apache Jena), Docker (for `atomgraph/saxon`), `xmlstarlet`, `xmllint` and `python3`. The screencast rig needs Node, `ffmpeg`, `cwebp`, `vhs` and GNU `sha1sum`.

## Installing an app

```bash
make install    # prompts for base URL, keystore path, keystore password and optional proxy URL
```

`make install` is `lib/install.mk`, included by every app Makefile. It exports the answers as `LDH_BASE`, `LDH_CERT_FILE`, `LDH_CERT_PASSWORD` and `LDH_PROXY` — the variables the CLI reads — and runs the app's `install.sh` in that environment. No credential is put on a command line, so the password needs no escaping. To install unattended, export the four variables and run `./install.sh`.

Each `install.sh` sources `lib/ldh-app.sh` and is the app's own sequence of steps:

- `ldh admin make-public` — an authorization that makes the app readable by anyone
- `ldh_app_import_ns admin/model` — resets the namespace ontology document with `patch-ontology.ru`, appends `ns.ttl` under `@base <{base}ns>`, clears the ontology cache
- `ldh push --dir . "$LDH_BASE"` — PUTs every RDF file to the document its path spells and uploads every other file into its folder's document
- `ldh_app_import_csv . imports.csv` — one `ldh import csv` per manifest row (`query_filename,csv_filename,target,title`)
- app-specific steps: `ldh admin create authorization`, `ldh packages add`, `ldh import rdf`

**Re-runs converge but are not clean.** `ldh push` PUTs and the ontology is reset before re-import, so documents and the model end up the same. `make-public`, `create authorization` and every import are POSTs, so each run adds another authorization and another import record. Nothing probes for an earlier install.

### App layout

The file tree is the URL tree. `categories.ttl` installs to `{base}categories/`, the sibling folder `categories/` holds that document's uploads (and, by convention, its `.csv` and mapping `.rq`), and `root.ttl` is the base document itself. `.ldhignore` lists what is neither a document nor an upload — `admin/`, `Makefile`, `*.sh`, `*.csv`, repository screenshots — because the CLI skips nothing but hidden entries.

Mapping queries are `CONSTRUCT { GRAPH ?g { … } }` over CSV rows addressed as `<#column>`, and build every URI from the `$base` constant the platform binds. **Do not pin a hostname in a query or document**: a class is `BIND(uri(concat(str($base), "ns#School")) AS ?type)`, a query on the `<ns>` endpoint may use relative IRIs (`<ns#>`, `<sparql>`), and a query on the data endpoint cannot, since that endpoint parses with no base.

Media is content-addressed. `ldh push` uploads a file to `{base}uploads/{sha1}`, and a CSV column or a document references it by that hash, so the bytes must be final before anything references them.

## Documentation (`docs/`)

```bash
make install       # push the docs to a LinkedDataHub instance
make validate      # Turtle syntax and canonical XMLLiteral check
make check-links   # resolve every relative link in the whole repository
make ttl-to-html   # static site into docs/html/ (gitignored)
```

Each `.ttl` is one page: a `dh:Container` or `dh:Item` with `rdf:_N`-ordered blocks, whose content is an XHTML `rdf:XMLLiteral`. The static build (`ttl-to-html.sh` + `ttl-to-html.xsl`) is a second renderer of the same sources and rewrites `uploads/{sha1}` to `files/{name}`, terminating on a hash it cannot find — a clean `make ttl-to-html` proves every baked hash resolves.

CI (`.github/workflows/check-docs.yml`) runs RDF syntax, canonical-XML and link checks on every push. The static build and the GitHub Pages deploy (`publish-docs.yml`) run only on pushes to `master` that touch `docs/`.

XHTML inside `rdf:XMLLiteral` must be exclusive canonical XML: attributes alphabetical, explicit end tags (`<br></br>`, `<img …></img>`), each start tag on one line. `check-xmlliterals.sh` diffs each literal against `xmllint --exc-c14n`.

### Documentation media (`screencast/`)

Screenshots and clips are produced by a scripted Playwright rig, never taken by hand.

```bash
cd screencast
node docs/shoot.mjs --base … --cert-file … --cert-password-file … [--only reference]
make docs-publish   # optimise docs/out/ into ../docs/, printing sha1 per published file
make docs-fill      # point the .ttl sources at the published files (idempotent)
```

- `docs/manifest.mjs` is the shot list — one entry per `div.screenshot-placeholder` in the `.ttl` sources, keyed by its caption. New slots go there, not in the runner.
- Each entry's `want` is asserted after `act` and before the capture, so a shot that never reached its state is reported missed rather than written.
- `blocked` slots stay as placeholders with their reason recorded. Do not fill one by hand.
- The shoot writes **masters** — 2880px lossless PNG, a `.webm` and an `.mp4` per clip — into `docs/out/`, plus an `index.json`. It never edits a `.ttl`; `docs/fill.mjs` does.
- `make docs-publish` derives the web assets into `docs/`: stills to WebP at 2240px, `.mp4`s copied (already CRF 20 / `yuv420p` / faststart), `.webm`s dropped.

**Optimise before hashing.** Uploads are content-addressed at `{base}uploads/{sha1}`, so a reference is only valid for the bytes that ship — never hash a master.

References are absolute, `/uploads/{sha1}`: the `uploads/` namespace hangs off the base URI, outside the document hierarchy, so a relative path would encode the referring document's depth and break when it moves. They live inside canonical `rdf:XMLLiteral` bodies:

```xml
<img alt="The document tree with a container expanded" src="/uploads/{sha1}"></img>
<video aria-label="Browsing and navigating data" controls="controls" preload="metadata" src="/uploads/{sha1}"></video>
```

A clip is a `<video>`, never an `<object>`. Uploads are served with `Content-Security-Policy: default-src 'none'; sandbox` (the LNK-011 stored-XSS fix). An `<object>` loads the file as a nested *document*, so that CSP governs the document's own media load and Chrome blocks it. A `<video>` is a subresource of the page and loads normally. Images are unaffected for the same reason.

`docs/install.sh` ships them: `ldh push` uploads every non-ignored, non-RDF file to its folder's document at the content-addressed URI the sources already name.

## Packages (`packages/`)

A package is a `dh:Container` document whose `foaf:primaryTopic` is an `lds:Package` naming an `lds:ontology` and an `ac:stylesheet`. The directory path is the package URI: `packages/editor/taxonomy/` is `https://packages.linkeddatahub.com/editor/taxonomy/#this`. A dataspace imports it with one `ldh:import` triple (`ldh packages add`); the platform then materialises the ontology as an editable document under the admin `ontologies/` container and copies the stylesheet under `/static/com/linkeddatahub/packages/`, both once at import. See `packages/README.md` and `docs/reference/administration/packages.ttl`.

## File types

- `.ttl` — Turtle: documents, ontologies, data
- `.rq` — SPARQL mapping queries for imports
- `.ru` — SPARQL updates (the ontology reset)
- `.csv` — import data; `imports.csv` is the import manifest
- `.xsl` — package stylesheets and the docs' static renderer
- `.sh` — installers and validators
- `.webp` / `.mp4` — documentation media, published by `make docs-publish`
- `.ldhignore` — what `ldh push` must skip, gitignore-style, per subtree
