#!/usr/bin/env bash
# Brings the app on a LinkedDataHub instance up to date with this folder after a commit: pushes the
# document tree if a pushed document or file changed, deletes the documents whose sources are gone,
# and re-imports the UNESCO Thesaurus if its data or query changed, waiting for it to finish. Safe to
# run on every commit; install.sh does the one-off steps, the package import among them.
#
# Reads the LDH_* connection like install.sh, and LDH_CHANGED / LDH_PREVIOUS_TREE (see lib/ldh-app.sh).
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Pushing changed documents and files"
ldh_app_push_changed "$app_dir"

ldh_app_step "Deleting removed documents"
ldh_app_delete_removed "$app_dir"

if ldh_app_changed 'concept-schemes/unesco-thesaurus/*'; then
    ldh_app_step "Importing SKOS vocabulary"
    ldh_app_track_import "${LDH_BASE}concept-schemes/unesco-thesaurus/" ldh import rdf \
      --title "Unesco Thesaurus SKOS" \
      --query-file "$app_dir/concept-schemes/unesco-thesaurus/skos-import.rq" \
      --rdf-file "$app_dir/concept-schemes/unesco-thesaurus/unesco-thesaurus.ttl" \
      --content-type "text/turtle" \
      "${LDH_BASE}concept-schemes/unesco-thesaurus/" < /dev/null
    ldh_app_await_imports
fi
