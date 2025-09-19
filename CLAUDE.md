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
- `Makefile` - Interactive installation and build targets