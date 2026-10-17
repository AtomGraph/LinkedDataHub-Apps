#!/usr/bin/env bash
# Brings the package registry on a LinkedDataHub instance up to date with this folder after a commit:
# pushes the package descriptors and files if one changed, deletes the documents whose sources are
# gone, and declares the package stylesheets again whenever the push ran, since its PUTs replace every
# descriptor and with it the ac:stylesheet install.sh added. Dataspaces that already import a package
# keep the stylesheet they copied until the package is added again.
#
# Reads the LDH_* connection like install.sh, and LDH_CHANGED / LDH_PREVIOUS_TREE (see lib/ldh-app.sh).
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_sync "$app_dir"

[ "$LDH_APP_PUSHED" = 1 ] || exit 0

ldh_app_step "Declaring package stylesheets"
# a package is the folder its stylesheet is in, e.g. editor/taxonomy/skos.xsl -> ${LDH_BASE}editor/taxonomy/#this
(cd "$app_dir" && find . -name '*.xsl' -not -path './.*' | sed 's|^\./||' | sort) | while read -r stylesheet; do
    package_doc="${LDH_BASE}$(dirname "$stylesheet")/"
    upload="${LDH_BASE}uploads/$(shasum -a 1 "$app_dir/$stylesheet" | cut -d' ' -f1)"
    printf "Declaring %s as the stylesheet of %s#this\n" "$upload" "$package_doc"
    echo "INSERT { <${package_doc}#this> <https://w3id.org/atomgraph/client#stylesheet> <${upload}> } WHERE { }" |
        ldh patch "$package_doc"
done
