#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"
imports_csv="$(dirname "$(realpath "$0")")/imports.csv"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

titles=()
queries=()
files=()

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"/imports

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
    title=$(echo "$row" | cut -d "," -f 3)

    titles+=("$title")
    
    # create query

    query_doc=$(./create-query.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --title "$title" \
      --query-file "$pwd/${query_filename}" \
      "${request_base}service")

    query_doc=$(echo "$query_doc" | sed -e "s|$base|$request_base|g")

    pushd . > /dev/null && cd "$SCRIPT_ROOT"

    query_ntriples=$(./get-document.sh \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --accept 'application/n-triples' \
      "$query_doc")

    popd > /dev/null

    query=$(echo "$query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI
    queries+=("$query")

    # upload file

    file_doc=$(./create-file.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --title "$title" \
      --file "$pwd/${csv_filename}" \
      --file-content-type "text/csv" \
      "${request_base}service")

    file_doc=$(echo "$file_doc" | sed -e "s|$base|$request_base|g")

    pushd . > /dev/null && cd "$SCRIPT_ROOT"

    file_ntriples=$(./get-document.sh \
    -f "$cert_pem_file" \
    -p "$cert_password" \
    --accept 'application/n-triples' \
    "$file_doc")

    popd > /dev/null

    file=$(echo "$file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI
    files+=("$file")

    # iterate

    ((index++))
done

# start imports - postpone until after documents are created so we don't get concurrent updates to the triplestore

for i in "${!files[@]}"; do
    printf "\n### Importing CSV from %s\n\n" "${files[$i]}"

    ./create-csv-import.sh \
      -b "$base" \
      -f "$cert_pem_file" \
      -p "$cert_password" \
      --title "${titles[$i]}" \
      --query "${queries[$i]}" \
      --file "${files[$i]}" \
      --delimiter "," \
      "${request_base}importer"
done

popd