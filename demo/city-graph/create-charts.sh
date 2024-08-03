#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

chart_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Charts" \
  --slug "charts" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"
)

parking_facilities_doc=$(./create-item.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Parking facilities" \
  --slug "parking-facilities" \
  --container "$chart_container"
)

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Largest parking facilities" \
  --fragment "parking-facilities-by-spaces" \
  --query-file "${pwd}/queries/charts/parking-facilities-by-spaces.rq"
  "$parking_facilities_doc"

pushd . > /dev/null && cd "$SCRIPT_ROOT"

query_ntriples=$(./get.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$query_doc")

popd > /dev/null

query=$(echo "$query_ntriples" | sed -rn "s/<${query_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

./create-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Largest parking facilities" \
  --slug largest-parkings \
  --query "$query" \
  --chart-type "https://w3id.org/atomgraph/client#BarChart" \
  --category-var-name "name" \
  --series-var-name "spaces"
#  --fragment this \

popd
