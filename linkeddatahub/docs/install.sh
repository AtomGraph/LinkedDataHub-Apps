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
pwd="$(realpath -s "$PWD")"

pushd . && cd ./admin

printf "\n### Making the app public\n\n"

./make-public.sh "$base" "$cert_pem_file" "$cert_password"

popd

printf "\n### Creating authorizations\n\n"

# find "${pwd}" -name '*.ttl' -exec ./admin/create-authorization.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} \;

printf "\n### Update documents\n\n"

find "${pwd}" -name '*.ttl' -exec ./update-document.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} \;

printf "\n### Uploading images\n\n"

find "${pwd}/files/images" -type f -exec ./upload-file.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} \;

printf "\n### Uploading videos\n\n"

find "${pwd}/files/videos" -type f -exec ./upload-file.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} \;