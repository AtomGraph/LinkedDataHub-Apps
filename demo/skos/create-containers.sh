#!/bin/bash

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

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

select_concepts=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select concepts" \
--slug select-concepts \
--query-file "$pwd/queries/select-concepts.rq" \
"${request_base}queries/")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Concepts" \
--slug "concepts" \
--select "${select_concepts}#this" \
--parent "$base" \
"$request_base"

select_concept_schemes=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select concept schemes" \
--slug select-concept-schemes \
--query-file "$pwd/queries/select-concept-schemes.rq" \
"${request_base}queries/")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Concept schemes" \
--slug "concept-schemes" \
--select "${select_concept_schemes}#this" \
--parent "$base" \
"$request_base"

popd