#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
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

pwd="$(realpath "$PWD")"

printf "\n### Creating authorization to make the app public\n\n"

make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --proxy "$proxy"

cd .admin/model

printf "\n### Importing namespace ontology\n\n"

./import-ns.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ../..

printf "\n### Updating documents and uploading files\n\n"

if [[ -f ".root.ttl" ]]; then
  printf "\n### Updating %s\n" "$base"
  cat .root.ttl | turtle --base="$base" | put.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --proxy "$proxy" \
    -t "application/n-triples" \
    "$base"
fi

./update-folder.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" "$pwd" "$proxy"

printf "\n### Importing CSV data\n\n"

./import-csv.sh "$base" "$cert_pem_file" "$cert_password" "$proxy" "$pwd/imports.csv"