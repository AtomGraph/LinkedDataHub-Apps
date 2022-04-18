#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
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

printf "\n### Creating authorization to make the app public\n\n"

"$SCRIPT_ROOT"/admin/acl/make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --proxy "$proxy"

cd admin/model

# printf "\n### Adding schema.org import to domain ontology\n\n"
# disable schema.org as import because its URI does not resolve to an ontology
# ./add-imports.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Creating classes\n\n"

./create-classes.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ..

printf "\n### Clearing ontologies\n\n"

./clear-ontologies.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ..

printf "\n### Creating containers\n\n"

./create-containers.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Importing CSV data\n\n"

./import-csv.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"