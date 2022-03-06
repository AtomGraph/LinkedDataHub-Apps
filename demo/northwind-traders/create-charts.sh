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

pwd=$(realpath -s $PWD)

pushd . && cd "$SCRIPT_ROOT"

query=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Top selling products" \
  --query-file "${pwd}/queries/charts/select-products-by-sales.rq" \
  "${request_base}service"
)

./create-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Top selling products" \
  --query "${query}#this" \
  --chart-type "https://w3id.org/atomgraph/client#BarChart" \
  --category-var-name "productName" \
  --series-var-name "totalSales" \
  "${request_base}service"

query=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Sales by region per year" \
  --query-file "${pwd}/queries/charts/select-sales-by-regions-by-year.rq" \
  "${request_base}service"
)

./create-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Sales by region per year" \
  --query "${query}#this" \
  --chart-type "https://w3id.org/atomgraph/client#Table" \
  --category-var-name "year" \
  --series-var-name "regionName" \
  --series-var-name "totalSales" \
  "${request_base}service"

popd
