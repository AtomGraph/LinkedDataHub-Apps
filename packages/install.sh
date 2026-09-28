#!/usr/bin/env bash
# Publishes the package registry onto a LinkedDataHub instance with the ldh CLI: pushes the document
# tree, whose folders are the package URIs. The registry is public data, so there is no make-public.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges: PUT replaces each document.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Pushing package descriptors and files"
ldh push --dir "$app_dir" "$LDH_BASE"
