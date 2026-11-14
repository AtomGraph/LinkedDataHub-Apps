#!/usr/bin/env bash
# Brings the documentation on a LinkedDataHub instance up to date with this folder after a commit:
# pushes the document tree if a pushed document or file changed and deletes the documents whose
# sources are gone. Safe to run on every commit; install.sh does the one-off steps.
#
# Reads the LDH_* connection like install.sh, and LDH_CHANGED / LDH_PREVIOUS_TREE (see lib/ldh-app.sh).
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_sync "$app_dir"
