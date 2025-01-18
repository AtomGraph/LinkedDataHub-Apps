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

printf "\n### Creating authorizations\n\n"

# should not be necessary with LDH v5
# find "$pwd" -name '*.ttl' -exec ./admin/acl/create-authorization.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;

printf "\n### Update documents (traverse folders recursively)\n\n"

update_documents() {
  local folder="$1"

  # Iterate over .ttl files in the current folder
  for ttl_file in "$folder"/*.ttl; do
    if [[ -f "$ttl_file" ]]; then
       echo "Found .ttl file: $ttl_file"  # Debug output
      ./update-document.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" "$ttl_file" "$proxy"
    fi
  done

  # Recurse into subdirectories
  for subfolder in "$folder"/*/; do
    if [[ -d "$subfolder" ]]; then
      echo "Entering subfolder: $subfolder"  # Debug output
      update_documents "$subfolder"
    fi
  done
}

update_documents "$pwd"

printf "\n### Uploading images\n\n"

find "${pwd}/files/images" -type f -exec ./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;

printf "\n### Uploading videos\n\n"

find "${pwd}/files/videos" -type f -exec ./upload-file.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;