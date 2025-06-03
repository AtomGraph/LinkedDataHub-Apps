#!/bin/bash

if [ "$#" -ne 5 ] && [ "$#" -ne 6 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password $pwd $abs_folder [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../ssl/owner/cert.pem Password /folder /folder/ [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"
pwd="$4"
folder="$5"

if [ -n "$6" ]; then
    proxy="$6"
else
    proxy="$base"
fi

echo "Processing folder: $folder"  # Debug output

for ttl_file in "$folder"/*.ttl; do
  if [[ -f "$ttl_file" ]]; then
    echo "Found .ttl file: $ttl_file"  # Debug output
    ./update-document.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" "$ttl_file" "$proxy"
  fi
done

find "$folder" -mindepth 1 -maxdepth 1 -type d -exec ./update-folder.sh "$base" "$cert_pem_file" "$cert_password" "$pwd" {} "$proxy" \;
