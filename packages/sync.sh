#!/usr/bin/env bash
# Brings the package registry on a LinkedDataHub instance up to date with this folder after a commit:
# pushes the package descriptors and files if one changed, deletes the documents whose sources are
# gone and re-declares the stylesheet of every package whose stylesheet changed. Dataspaces that
# already import a package keep the stylesheet they copied until the package is added again.
#
# Reads the LDH_* connection like install.sh, and LDH_CHANGED / LDH_PREVIOUS_TREE (see lib/ldh-app.sh).
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Pushing changed package descriptors and files"
ldh_app_push_changed "$app_dir"

ldh_app_step "Deleting removed documents"
ldh_app_delete_removed "$app_dir"

ldh_app_step "Declaring changed package stylesheets"
(cd "$app_dir" && find . -name '*.xsl' -not -path './.*' | sed 's|^\./||' | sort) | while read -r stylesheet; do
    ldh_app_changed "$stylesheet" || continue
    package_doc="${LDH_BASE}$(dirname "$stylesheet")/"
    upload="${LDH_BASE}uploads/$(shasum -a 1 "$app_dir/$stylesheet" | cut -d' ' -f1)"
    printf "Declaring %s as the stylesheet of %s#this\n" "$upload" "$package_doc"
    echo "INSERT { <${package_doc}#this> <https://w3id.org/atomgraph/client#stylesheet> <${upload}> } WHERE { }" |
        ldh patch "$package_doc"
done
