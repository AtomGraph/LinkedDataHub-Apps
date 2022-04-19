#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/skos/ ../../../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pushd . && cd "$SCRIPT_ROOT"

skos_doc=$(./create-item.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "SKOS" \
  --slug "skos" \
  --container "${base}admin/model/ontologies/"
)

popd

pushd . && cd "$SCRIPT_ROOT"/admin/model

./import-ontology.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --source "http://www.w3.org/2004/02/skos/core" \
  --graph "$skos_doc"

popd

pushd . && cd "$SCRIPT_ROOT/admin"

./add-ontology-import.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --import "http://www.w3.org/2004/02/skos/core" \
  "${base}admin/model/ontologies/namespace/"

popd