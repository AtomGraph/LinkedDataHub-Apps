#!/bin/bash

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0 $base $cert_pem_file $cert_password" >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/certs/owner.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

pushd . && cd ./admin

printf "\n### Making the app public\n\n"

./make-public.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Creating authorizations\n\n"

./create-acl.sh "$base" "$cert_pem_file" "$cert_password"

popd

printf "\n### Creating documents\n\n"

./create-documents.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Uploading images\n\n"

./upload-images.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Uploading videos\n\n"

./upload-videos.sh "$base" "$cert_pem_file" "$cert_password"