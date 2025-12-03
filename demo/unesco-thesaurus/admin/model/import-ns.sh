#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

admin_uri() {
    local uri="$1"
    echo "$uri" | sed 's|://|://admin.|'
}

admin_base=$(admin_uri "$base")
admin_proxy=$(admin_uri "$proxy")

# create a new document for the SKOS ontology

target=$(create-item.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --title "SKOS" \
  --slug "skos" \
  --container "${admin_base}ontologies/"
)

# import the SKOS ontology data

import-ontology.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --source "http://www.w3.org/2004/02/skos/core" \
  --graph "$target"

# clear the old properties of the namespace ontology

{ echo "BASE <${admin_base}ontologies/namespace/>"; cat patch-ontology.ru; } | patch.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$admin_proxy" \
    "${admin_base}ontologies/namespace/"

# append the ns.ttl file to the namespace ontology
# prepend @base directive using end-user base URI so that the : prefix
# (defined as <ns#> in ns.ttl) resolves to the end-user namespace

{ echo "@base <${base}ns> ."; cat ns.ttl; } | post.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$admin_proxy" \
    --content-type "text/turtle" \
    "${admin_base}ontologies/namespace/"

clear-ontology.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  -b "$admin_base" \
  --proxy "$admin_proxy" \
  --ontology "${base}ns#"
