#!/bin/bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/certs/owner.p12.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

echo "REQUEST BASE: $request_base"

printf "\n### Creating authorization to make the app public\n\n"

"$SCRIPT_ROOT"/admin/acl/make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --request-base "$request_base"

cd admin/model

printf "\n### Adding schema.org import to domain ontology\n\n"

./add-imports.sh "$base" "$cert_pem_file" "$cert_password" "$request_base"

printf "\n### Creating classes\n\n"

./create-classes.sh "$base" "$cert_pem_file" "$cert_password"

cd ../sitemap

printf "\n### Creating template queries\n\n"

./create-queries.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Creating templates\n\n"

./create-templates.sh "$base" "$cert_pem_file" "$cert_password"

cd ..

printf "\n### Clearing ontologies\n\n"

./clear-ontologies.sh "$base" "$cert_pem_file" "$cert_password"

cd ..

printf "\n### Creating containers\n\n"

./create-containers.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Importing CSV data\n\n"

./import-csv.sh "$base" "$cert_pem_file" "$cert_password"