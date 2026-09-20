#!/usr/bin/env bash
# Installs the documentation onto a LinkedDataHub instance with the ldh CLI: makes it public and
# pushes the document tree with its media. Re-running is safe: PUT replaces each document.
set -euo pipefail

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../LinkedDataHub/ssl/owner/keystore.p12 Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_file=$(realpath "$2")
cert_password="$3"
proxy="${4:-$base}"

app_dir="$(cd "$(dirname "$0")" && pwd)"

printf "\n### Creating authorization to make the app public\n\n"

ldh admin make-public -b "$base" -f "$cert_file" -p "$cert_password" --proxy "$proxy"

printf "\n### Pushing documents and files\n\n"

ldh push -b "$base" -f "$cert_file" -p "$cert_password" --proxy "$proxy" --dir "$app_dir" "$base"
