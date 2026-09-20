#!/usr/bin/env bash
# Installs the app onto a LinkedDataHub instance with the ldh CLI: makes it public, creates its
# authorizations, pushes the document tree with its files, imports the taxonomy editor package and
# imports the UNESCO Thesaurus SKOS data. Re-running is safe: PUT replaces each document.
set -euo pipefail

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/ssl/owner/keystore.p12 Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_file=$(realpath "$2")
cert_password="$3"
proxy="${4:-$base}"

app_dir="$(cd "$(dirname "$0")" && pwd)"

printf "\n### Creating authorization to make the app public\n\n"

ldh admin make-public -b "$base" -f "$cert_file" -p "$cert_password" --proxy "$proxy"

printf "\n### Creating authorizations\n\n"

"$app_dir/admin/acl/create-authorizations.sh" "$base" "$cert_file" "$cert_password" "$proxy"

printf "\n### Pushing documents and files\n\n"

ldh push -b "$base" -f "$cert_file" -p "$cert_password" --proxy "$proxy" --dir "$app_dir" "$base"

printf "\n### Importing taxonomy editor package\n\n"

ldh packages add -b "$base" -f "$cert_file" -p "$cert_password" --proxy "$proxy" --package "https://packages.linkeddatahub.com/editor/taxonomy/#this"

printf "\n### Importing SKOS vocabulary\n\n"

# into the concept scheme's document, which the push created from concept-schemes/unesco-thesaurus.ttl
ldh import rdf \
  -b "$base" \
  -f "$cert_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Unesco Thesaurus SKOS" \
  --query-file "$app_dir/concept-schemes/unesco-thesaurus/skos-import.rq" \
  --rdf-file "$app_dir/concept-schemes/unesco-thesaurus/unesco-thesaurus.ttl" \
  --content-type "text/turtle" \
  "${base}concept-schemes/unesco-thesaurus/"
