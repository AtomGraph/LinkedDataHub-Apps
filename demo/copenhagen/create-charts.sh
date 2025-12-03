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

chart_doc=$(create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Largest parking facilities" \
  --slug "largest-parkings" \
  --container "${base}charts/"
)

query_id="select-largest-parkings"

add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Largest parking facilities" \
  --uri "#${query_id}" \
  --query-file "${pwd}/queries/charts/parking-facilities-by-spaces.rq" \
  "$chart_doc"

add-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Largest parking facilities" \
  --uri "#this" \
  --query "${chart_doc}#${query_id}" \
  --chart-type "https://w3id.org/atomgraph/client#BarChart" \
  --category-var-name "name" \
  --series-var-name "spaces" \
  "$chart_doc"
