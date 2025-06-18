#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pwd=$(realpath "$PWD")

# concepts

container=$(create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Concepts" \
  --slug "concepts" \
  --parent "$base"
)

remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-concepts-query"

add-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select concepts" \
  --fragment "$query_id" \
  --query-file "${pwd}/queries/select-concepts.rq" \
  "$container"

view_id="select-concepts-view"

add-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --fragment "$view_id" \
  --query "${container}#${query_id}" \
  "$container"

object_id="select-concepts"

add-object-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --fragment "$object_id" \
  --value "${container}#${view_id}" \
  "$container"

# concept schemes

container=$(create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Concept schemes" \
  --slug "concept-schemes" \
  --parent "$base"
)

remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-concept-schemes-query"

add-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select concept schemes" \
  --fragment "$query_id" \
  --query-file "${pwd}/queries/select-concept-schemes.rq" \
  "$container"

view_id="select-concept-schemes-view"

add-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --fragment "$view_id" \
  --query "${container}#${query_id}" \
  "$container"

object_id="select-concept-schemes"

add-object-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --fragment "$object_id" \
  --value "${container}#${view_id}" \
  "$container"
