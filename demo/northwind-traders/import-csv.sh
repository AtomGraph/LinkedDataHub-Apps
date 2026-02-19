#!/usr/bin/env bash

if [ "$#" -ne 4 ] && [ "$#" -ne 5 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy] $imports_file' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/] "$pwd/imports.csv"' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath "$2")
cert_password="$3"

if [ -n "$5" ]; then
    proxy="$4"
    imports_csv="$5"
else
    proxy="$base"
    imports_csv="$4"
fi

titles=()
queries=()
files=()
targets=()

pwd=$(realpath "$PWD")

arr_csv=()
while IFS= read -r line
do
    arr_csv+=("$line")
done < <(tail -n +2 "$imports_csv")

index=0
for row in "${arr_csv[@]}"
do
    query_filename=$(echo "$row" | cut -d "," -f 1)
    csv_filename=$(echo "$row" | cut -d "," -f 2)
    target_path=$(echo "$row" | cut -d "," -f 3)
    title=$(echo "$row" | cut -d "," -f 4)

    target="${base}${target_path}"
    titles+=("$title")
    targets+=("$target")

    # create query

    # Generate query ID for fragment identifier
    query_id=$(uuidgen | tr '[:upper:]' '[:lower:]')

    add-construct.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --proxy "$proxy" \
      --title "$title" \
      --uri "#${query_id}" \
      --query-file "$pwd/${query_filename}" \
      "$target"

    query="${target}#${query_id}"
    queries+=("$query")

    # upload file

    add-file.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --proxy "$proxy" \
      --title "$title" \
      --file "$pwd/${csv_filename}" \
      --content-type "text/csv" \
      "$target"

    # Calculate file URI from SHA1 hash
    sha1sum=$(shasum -a 1 "$pwd/${csv_filename}" | awk '{print $1}')
    file="${base}uploads/${sha1sum}"
    files+=("$file")

    # iterate

    ((index++))
done

# start imports - postpone until after documents are created so we don't get concurrent updates to the triplestore

for i in "${!files[@]}"; do
    printf "\n### Importing CSV from %s\n\n" "${files[$i]}"

    add-csv-import.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --proxy "$proxy" \
      --title "${titles[$i]}" \
      --query "${queries[$i]}" \
      --file "${files[$i]}" \
      --delimiter "," \
      "${targets[$i]}"
done
