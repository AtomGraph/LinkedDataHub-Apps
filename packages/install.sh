#!/usr/bin/env bash
# Publishes the package registry onto a LinkedDataHub instance with the ldh CLI: makes it public and
# pushes the document tree, whose folders are the package URIs. A dataspace importing a package
# dereferences its descriptor, ontology and stylesheet anonymously, so the registry must be readable
# without a certificate.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges: PUT replaces each document. make-public is a POST and adds another
# authorization per run.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Creating authorization to make the registry public"
ldh admin make-public

ldh_app_step "Pushing package descriptors and files"
ldh push --dir "$app_dir" "$LDH_BASE"
