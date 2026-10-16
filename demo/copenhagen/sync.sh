#!/usr/bin/env bash
# Brings the app on a LinkedDataHub instance up to date with this folder after a commit: re-imports
# the namespace ontology if the model changed, pushes the document tree if a pushed document or file
# changed, deletes the documents whose sources are gone, and re-runs the CSV imports whose query or
# data changed, waiting for them to finish. Safe to run on every commit; install.sh does the one-off
# steps.
#
# Reads the LDH_* connection like install.sh, and LDH_CHANGED / LDH_PREVIOUS_TREE (see lib/ldh-app.sh).
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../../lib/ldh-app.sh"
ldh_app_require_env

if ldh_app_changed 'admin/model/*'; then
    ldh_app_step "Importing namespace ontology"
    ldh_app_import_ns "$app_dir/admin/model"
fi

ldh_app_step "Pushing changed documents and files"
ldh_app_push_changed "$app_dir"

ldh_app_step "Deleting removed documents"
ldh_app_delete_removed "$app_dir"

ldh_app_step "Importing changed CSV data"
ldh_app_import_csv "$app_dir" "$app_dir/imports.csv"
ldh_app_await_imports
