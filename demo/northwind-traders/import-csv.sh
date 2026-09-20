#!/usr/bin/env bash
# Runs one CSV import per row of the manifest: ldh import csv adds the CONSTRUCT query, uploads
# the CSV into the target document and creates the import that maps one into the other.
set -euo pipefail

if [ "$#" -ne 4 ] && [ "$#" -ne 5 ]; then
  echo "Usage:   $0" '$base $cert_file $cert_password [$proxy] $imports_file' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/ssl/owner/keystore.p12 Password [https://localhost:5443/] imports.csv' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_file=$(realpath "$2")
cert_password="$3"

if [ "$#" -eq 5 ]; then
    proxy="$4"
    imports_csv="$5"
else
    proxy="$base"
    imports_csv="$4"
fi

app_dir="$(cd "$(dirname "$0")" && pwd)"

while IFS=, read -r query_filename csv_filename target_path title; do
    [ -n "$query_filename" ] || continue

    printf "\n### Importing %s into %s\n\n" "$csv_filename" "${base}${target_path}"

    ldh import csv \
      -b "$base" \
      -f "$cert_file" \
      -p "$cert_password" \
      --proxy "$proxy" \
      --title "$title" \
      --query-file "$app_dir/$query_filename" \
      --csv-file "$app_dir/$csv_filename" \
      "${base}${target_path}"
done < <(tail -n +2 "$imports_csv")
