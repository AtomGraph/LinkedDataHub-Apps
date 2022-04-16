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

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

select_concepts_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Select concepts" \
  --slug select-concepts \
  --query-file "$pwd/queries/select-concepts.rq" \
  "${request_base}service")

select_concepts_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$select_concepts_doc")

select_concepts=$(echo "$select_concepts_ntriples" | sed -rn "s/<${select_concepts_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

concept_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Concepts" \
  --slug "concepts" \
  --parent "$base" \
  "${request_base}service")

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --this "$concept_container" \
  "$concept_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --this "$concept_container" \
  --first "$select_concepts" \
  "$concept_container"


select_concept_schemes_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Select concept schemes" \
  --slug select-concept-schemes \
  --query-file "$pwd/queries/select-concept-schemes.rq" \
  "${request_base}service")

select_concept_schemes_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$select_concepts_doc")

select_concept_schemes=$(echo "$select_concept_schemes_ntriples" | sed -rn "s/<${select_concept_schemes_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

concept_scheme_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Concept schemes" \
  --slug "concept-schemes" \
  --parent "$base" \
  "${request_base}service")

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --this "$concept_scheme_container" \
  "$concept_scheme_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --this "$concept_scheme_container" \
  --first "$select_concept_schemes" \
  "$concept_scheme_container"

popd