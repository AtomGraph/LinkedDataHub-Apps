#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/skos/ ../../../../../ssl/owner/cert.pem Password' >&2
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

pushd . && cd "$SCRIPT_ROOT"/admin/model

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "http://www.w3.org/2004/02/skos/core#Concept" \
  --label "Concept" \
  --slug concept \
  --constructor "{$base}ns#ConstructConcept" \
  --constraint "{$base}ns#MissingPrefLabel" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "http://www.w3.org/2004/02/skos/core#ConceptScheme" \
  --label "Concept scheme" \
  --slug concept-scheme \
  --constructor "{$base}ns#ConstructConceptScheme" \
  --constraint "{$base}ns#MissingTitle" \
  "${request_base}admin/model/ontologies/namespace/"

popd