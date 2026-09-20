#!/usr/bin/env bash
# Installs ns.ttl into the admin app's ontologies/namespace/ document, which LinkedDataHub serves
# at {base}ns: resets the document with patch-ontology.ru (everything but its own description),
# appends ns.ttl with @base <{base}ns> so its : prefix resolves to the end-user namespace, and
# clears the ontology from memory so it reloads.
set -euo pipefail

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../../../LinkedDataHub/ssl/owner/keystore.p12 Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_file=$(realpath "$2")
cert_password="$3"
proxy="${4:-$base}"

model_dir="$(cd "$(dirname "$0")" && pwd)"

admin_uri() {
    echo "$1" | sed 's|://|://admin.|'
}

admin_base=$(admin_uri "$base")
admin_proxy=$(admin_uri "$proxy")
ontology_doc="${admin_base}ontologies/namespace/"

printf "\n### Resetting namespace ontology document: %s\n" "$ontology_doc"

{ echo "BASE <${ontology_doc}>"; cat "$model_dir/patch-ontology.ru"; } | ldh patch \
    -f "$cert_file" \
    -p "$cert_password" \
    --proxy "$admin_proxy" \
    "$ontology_doc"

printf "\n### Appending ns.ttl to the namespace ontology\n"

{ echo "@base <${base}ns> ."; cat "$model_dir/ns.ttl"; } | ldh post \
    -f "$cert_file" \
    -p "$cert_password" \
    --proxy "$admin_proxy" \
    -t text/turtle \
    "$ontology_doc"

printf "\n### Clearing ontology from memory: %sns#\n" "$base"

ldh admin clear ontology \
    -b "$admin_base" \
    -f "$cert_file" \
    -p "$cert_password" \
    --proxy "$admin_proxy" \
    --ontology "${base}ns#"
