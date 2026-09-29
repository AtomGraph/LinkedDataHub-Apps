#!/usr/bin/env bash
# Publishes the package registry onto a LinkedDataHub instance with the ldh CLI: makes it public,
# pushes the document tree, whose folders are the package URIs, and uploads each package's stylesheet
# into its package document. A dataspace importing a package dereferences its descriptor, ontology and
# stylesheet anonymously, so the registry must be readable without a certificate.
#
# A descriptor carries no ac:stylesheet in this repository: the push uploads the package's .xsl file into
# the package document, as text/xsl, at {base}uploads/{SHA-1 of its content}, so the reference is added
# here, from the same file, and a changed stylesheet cannot leave a descriptor pointing at the previous one.
#
# Reads LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD and optionally LDH_PROXY; `make install` prompts
# for them. Re-running converges: PUT replaces each document and the stylesheet reference is added back
# to it. make-public is a POST and adds another authorization per run.
set -euo pipefail

app_dir="$(cd "$(dirname "$0")" && pwd)"
. "$app_dir/../lib/ldh-app.sh"
ldh_app_require_env

ldh_app_step "Creating authorization to make the registry public"
ldh admin make-public

ldh_app_step "Pushing package descriptors and files"
ldh push --dir "$app_dir" "$LDH_BASE"

ldh_app_step "Declaring package stylesheets"
# a package is the folder its stylesheet is in, e.g. editor/taxonomy/skos.xsl -> ${LDH_BASE}editor/taxonomy/#this
(cd "$app_dir" && find . -name '*.xsl' -not -path './.*' | sed 's|^\./||' | sort) | while read -r stylesheet; do
    package_doc="${LDH_BASE}$(dirname "$stylesheet")/"
    upload="${LDH_BASE}uploads/$(shasum -a 1 "$app_dir/$stylesheet" | cut -d' ' -f1)"
    printf "Declaring %s as the stylesheet of %s#this\n" "$upload" "$package_doc"
    echo "INSERT { <${package_doc}#this> <https://w3id.org/atomgraph/client#stylesheet> <${upload}> } WHERE { }" |
        ldh patch "$package_doc"
done
