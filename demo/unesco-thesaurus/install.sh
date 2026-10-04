#!/usr/bin/env bash
# Installs the app onto a LinkedDataHub instance with the ldh CLI: makes it public, grants
# authenticated agents read access to its items, pushes the document tree with its files, imports the
# taxonomy editor package and imports the UNESCO Thesaurus SKOS data. The ontology, constructors,
# constraints and stylesheet all come from the package.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges on the same documents — PUT replaces each one — but make-public,
# the authorization and the RDF import are POSTs, so each run adds another of each.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../../lib/ldh-app.sh"
ldh_app_require_env

admin_base=$(ldh_app_admin_uri "$LDH_BASE")
admin_proxy=$(ldh_app_admin_uri "$LDH_PROXY")

ldh_app_step "Creating authorization to make the app public"
ldh admin make-public

ldh_app_step "Creating authorization for authenticated agents to read items"
ldh admin create authorization \
  --proxy "$admin_proxy" \
  --label "Read access to graph items" \
  --agent-class "http://www.w3.org/ns/auth/acl#AuthenticatedAgent" \
  --to-all-in "https://w3id.org/atomgraph/linkeddatahub/document-hierarchy#Item" \
  --read \
  "$admin_base"

ldh_app_step "Pushing documents and files"
ldh push --dir "$app_dir" "$LDH_BASE"

ldh_app_step "Importing taxonomy editor package"
ldh packages add --package "https://packages.linkeddatahub.com/editor/taxonomy/#this"

ldh_app_step "Importing SKOS vocabulary"
# into the concept scheme's document, which the push created from concept-schemes/unesco-thesaurus.ttl
ldh import rdf \
  --title "Unesco Thesaurus SKOS" \
  --query-file "$app_dir/concept-schemes/unesco-thesaurus/skos-import.rq" \
  --rdf-file "$app_dir/concept-schemes/unesco-thesaurus/unesco-thesaurus.ttl" \
  --content-type "text/turtle" \
  "${LDH_BASE}concept-schemes/unesco-thesaurus/"
