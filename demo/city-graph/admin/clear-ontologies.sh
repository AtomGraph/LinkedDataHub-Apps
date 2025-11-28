#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$(realpath "$2")"
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

admin_uri() {
    local uri="$1"
    echo "$uri" | sed 's|://|://admin.|'
}

admin_base=$(admin_uri "$base")
admin_proxy=$(admin_uri "$proxy")

clear-ontology.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  -b "$admin_base" \
  --proxy "$admin_proxy" \
  --ontology "${base}ns#"
