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

# top selling products

query_doc=$(create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Products by sales" \
  --slug "products-by-sales" \
  --container "${base}queries/"
)

query_id="this"

add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Products by sales" \
  --fragment "$query_id" \
  --query-file "${pwd}/queries/charts/select-products-by-sales.rq" \
  "$query_doc"

chart_doc=$(create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Top selling products" \
  --slug "top-selling-products" \
  --container "${base}charts/"
)

add-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Top selling products" \
  --fragment this \
  --query "${query_doc}#${query_id}" \
  --chart-type "https://w3id.org/atomgraph/client#BarChart" \
  --category-var-name "productName" \
  --series-var-name "totalSales" \
  "$chart_doc"

# sales by region per year

query_doc=$(create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Sales by region per year" \
  --slug "sales-by-region-per-year" \
  --container "${base}queries/"
)

query_id="sales-by-regions-by-year"

add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Sales by region per year" \
  --fragment "$query_id" \
  --query-file "${pwd}/queries/charts/select-sales-by-regions-by-year.rq" \
  "$query_doc"

chart_doc=$(create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Sales by region per year" \
  --slug "sales-by-regions-by-year" \
  --container "${base}charts/"
)

add-result-set-chart.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Sales by region per year" \
  --fragment this \
  --query "${query_doc}#${query_id}" \
  --chart-type "https://w3id.org/atomgraph/client#Table" \
  --category-var-name "year" \
  --series-var-name "regionName" \
  --series-var-name "totalSales" \
  "$chart_doc"
