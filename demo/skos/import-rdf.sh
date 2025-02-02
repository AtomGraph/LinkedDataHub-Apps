#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

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

pushd . && cd "$SCRIPT_ROOT"/imports

./import-rdf.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "UN thesaurus SKOS (part 1)" \
  --query-file "$pwd/queries/skos-import.rq" \
  --file "$pwd/files/unesco-thesaurus.part1.ttl" \
  --file-content-type "text/turtle"

#./import-rdf.sh \
#  -b "$base" \
#  -f "$cert_pem_file" \
#  -p "$cert_password" \
#  --proxy "$proxy" \
#  --title "UN thesaurus SKOS" \
#  --query-file "$pwd/queries/skos-import.rq" \
#  --file "$pwd/files/unesco-thesaurus.part2.ttl" \
#  --file-content-type "text/turtle"

popd > /dev/null