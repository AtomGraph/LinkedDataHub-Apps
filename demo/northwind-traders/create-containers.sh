#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/ ../../../certs/martynas.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

select_children_topics=$(./create-select.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Select children topics" \
--slug select-children-topics \
--query-file "$pwd/queries/select-children-topics.rq")

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Categories" \
--slug "categories" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Customers" \
--slug "customers" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Employees" \
--slug "employees" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Orders" \
--slug "orders" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Products" \
--slug "products" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Regions" \
--slug "regions" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Shippers" \
--slug "shippers" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Suppliers" \
--slug "suppliers" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Territories" \
--slug "territories" \
--select "${select_children_topics}#this" \
--parent "$base" \
"$base"

popd
