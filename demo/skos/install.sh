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

pushd .

printf "\n### Creating authorization to make the app public\n\n"

"$SCRIPT_ROOT"/admin/acl/make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --proxy "$proxy"

printf "\n### Creating authorizations\n\n"

cd admin/acl

./create-authorizations.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ..

cd model

printf "\n### Import ontologies\n\n"

./import-ontologies.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Creating constraints\n\n"

./create-constraints.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

cd ..

printf "\n### Clearing ontologies\n\n"

./clear-ontologies.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

popd

printf "\n### Uploading CSS/XSLT files\n\n"

./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" "${pwd}/files/bootstrap.min.css" 'text/css' "$proxy" \;

./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" "${pwd}/files/skos.xsl" 'text/xsl' "$proxy" \;

printf "\n### Creating containers\n\n"

./create-containers.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Updating documents\n\n"

./update-documents.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"

printf "\n### Importing SKOS vocabulary\n\n"

./import-rdf.sh "$base" "$cert_pem_file" "$cert_password" "$proxy"
