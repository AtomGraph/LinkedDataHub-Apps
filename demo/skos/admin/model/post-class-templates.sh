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

# clear the old contents of the namespace ontology

{ echo "BASE <${base}admin/ontologies/namespace/>"; cat patch-ontology.ru; } | patch.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$proxy" \
    "${base}admin/ontologies/namespace/"

# append the new class templates to the namespace ontology

cat concept-template.ttl | post.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$proxy" \
    --content-type "text/turtle" \
    "${base}admin/ontologies/namespace/"

cat concept-scheme-template.ttl | post.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$proxy" \
    --content-type "text/turtle" \
    "${base}admin/ontologies/namespace/"
