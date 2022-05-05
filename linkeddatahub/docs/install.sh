#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/ssl/owner/cert.pem Password' >&2
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

pwd="$(realpath -s "$PWD")"

printf "\n### Creating authorization to make the app public\n\n"

"$SCRIPT_ROOT"/admin/acl/make-public.sh -b "$base" -f "$cert_pem_file" -p "$cert_password" --proxy "$request_base"

printf "\n### Creating authorizations\n\n"

find "${pwd}" -name '*.ttl' -exec ./admin/acl/create-authorization.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} "$request_base" \;

printf "\n### Update documents\n\n"

find "${pwd}" -name '*.ttl' -exec ./update-document.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} "$request_base" \;

printf "\n### Uploading images\n\n"

find "${pwd}/files/images" -type f -exec ./upload-file.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} "$request_base" \;

printf "\n### Uploading videos\n\n"

find "${pwd}/files/videos" -type f -exec ./upload-file.sh "${base}" "${cert_pem_file}" "${cert_password}" "${pwd}" {} "$request_base" \;