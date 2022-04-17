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

query_doc=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$request_base" \
  --title "Top selling products" \
  --query-file "${pwd}/queries/charts/select-products-by-sales.rq"
)

pushd . > /dev/null && cd "$SCRIPT_ROOT"

query_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$query_doc")

popd > /dev/null

query=$(echo "$query_ntriples" | sed -rn "s/<${query_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

./create-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$request_base" \
  --title "Top selling products" \
  --query "$query" \
  --chart-type "https://w3id.org/atomgraph/client#BarChart" \
  --category-var-name "productName" \
  --series-var-name "totalSales"

query_doc=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$request_base" \
  --title "Sales by region per year" \
  --query-file "${pwd}/queries/charts/select-sales-by-regions-by-year.rq"
)

pushd . > /dev/null && cd "$SCRIPT_ROOT"

query_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$query_doc")

popd > /dev/null

query=$(echo "$query_ntriples" | sed -rn "s/<${query_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

./create-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$request_base" \
  --title "Sales by region per year" \
  --query "$query" \
  --chart-type "https://w3id.org/atomgraph/client#Table" \
  --category-var-name "year" \
  --series-var-name "regionName" \
  --series-var-name "totalSales"

popd
