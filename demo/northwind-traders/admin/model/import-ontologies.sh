#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/northwind-traders/ ../../../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
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

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

printf "\n### Creating ontology item\n\n"

ont_doc=$(./create-item.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Northwind Traders" \
  --slug "northwind-traders" \
  --container "${base}admin/model/ontologies/"
)

popd

pushd . && cd "$SCRIPT_ROOT"

printf "\n### Appending ontology document\n\n"

cat "$pwd"/northwind-traders.ttl | turtle --base="$ont_doc" | "$SCRIPT_ROOT"/post.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  -t "application/n-triples" \
  "$ont_doc"

popd