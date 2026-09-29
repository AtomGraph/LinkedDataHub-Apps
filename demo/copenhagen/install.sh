#!/usr/bin/env bash
# Installs the app onto a LinkedDataHub instance with the ldh CLI: makes it public, installs the
# namespace ontology, pushes the document tree with its files, and runs the CSV imports.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges on the same documents — PUT replaces each one and the ontology is
# reset before re-import — but make-public and every CSV import are POSTs, so each run adds another
# authorization and another import record.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Creating authorization to make the app public"
ldh admin make-public

ldh_app_step "Importing namespace ontology"
ldh_app_import_ns "$app_dir/admin/model"

ldh_app_step "Pushing documents and files"
ldh push --dir "$app_dir" "$LDH_BASE"

ldh_app_step "Importing CSV data"
ldh_app_import_csv "$app_dir" "$app_dir/imports.csv"
