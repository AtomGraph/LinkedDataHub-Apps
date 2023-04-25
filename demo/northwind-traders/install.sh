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

pwd="$(realpath -s "$PWD")"

printf "\n### Creating authorization to make the app public\n\n"

"$SCRIPT_ROOT"/admin/acl/make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --proxy "$proxy"

cd admin/model

printf "\n### Import ontologies\n\n"

./import-ontologies.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Adding ontology import\n\n"

./add-imports.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Clearing ontologies\n\n"

cd ..

./clear-ontologies.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ..

printf "\n### Creating containers\n\n"

./create-containers.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Updating documents\n\n"

./update-documents.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Creating charts\n\n"

./create-charts.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Uploading files\n\n"

find "${pwd}/files/images/categories" -type f -exec ./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;

find "${pwd}/files/images/employees" -type f -exec ./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;

printf "\n### Importing CSV data\n\n"

./import-csv.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"