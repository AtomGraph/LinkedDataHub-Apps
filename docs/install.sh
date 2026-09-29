#!/usr/bin/env bash
# Installs the documentation onto a LinkedDataHub instance with the ldh CLI: makes it public and
# pushes the document tree with its media, which lands at the content-addressed {base}uploads/{sha1}
# the sources reference.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges: PUT replaces each document. make-public is a POST and adds another
# authorization per run.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Creating authorization to make the app public"
ldh admin make-public

ldh_app_step "Pushing documents and media"
ldh push --dir "$app_dir" "$LDH_BASE"
