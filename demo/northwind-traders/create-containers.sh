#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/ ../../../ssl/owner/cert.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$(realpath -s "$2")"
cert_password="$3"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

select_categories=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select categories" \
--slug select-categories \
--query-file "$pwd/queries/select-categories.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Categories" \
--slug "categories" \
--select "${select_categories}#this" \
--parent "$base" \
"${request_base}service"

select_customers=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select customers" \
--slug select-customers \
--query-file "$pwd/queries/select-customers.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Customers" \
--slug "customers" \
--select "${select_customers}#this" \
--parent "$base" \
"${request_base}service"

select_employees=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select employees" \
--slug select-employees \
--query-file "$pwd/queries/select-employees.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Employees" \
--slug "employees" \
--select "${select_employees}#this" \
--parent "$base" \
"${request_base}service"

select_orders=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select orders" \
--slug select-orders \
--query-file "$pwd/queries/select-orders.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Orders" \
--slug "orders" \
--select "${select_orders}#this" \
--parent "$base" \
"${request_base}service"

select_products=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select products" \
--slug select-products \
--query-file "$pwd/queries/select-products.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Products" \
--slug "products" \
--select "${select_products}#this" \
--parent "$base" \
"${request_base}service"

select_regions=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select regions" \
--slug select-regions \
--query-file "$pwd/queries/select-regions.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Regions" \
--slug "regions" \
--select "${select_regions}#this" \
--parent "$base" \
"${request_base}service"

select_shippers=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select shippers" \
--slug select-shippers \
--query-file "$pwd/queries/select-shippers.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Shippers" \
--slug "shippers" \
--select "${select_shippers}#this" \
--parent "$base" \
"${request_base}service"

select_suppliers=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select suppliers" \
--slug select-suppliers \
--query-file "$pwd/queries/select-suppliers.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Suppliers" \
--slug "suppliers" \
--select "${select_suppliers}#this" \
--parent "$base" \
"${request_base}service"

select_territories=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select territories" \
--slug select-territories \
--query-file "$pwd/queries/select-territories.rq" \
"${request_base}service")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Territories" \
--slug "territories" \
--select "${select_territories}#this" \
--parent "$base" \
"${request_base}service"

popd
