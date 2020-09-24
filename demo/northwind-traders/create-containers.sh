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

pushd . && cd "$SCRIPT_ROOT"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Categories" \
--slug "categories" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Customers" \
--slug "custoemrs" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Employees" \
--slug "employees" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Orders" \
--slug "orders" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Products" \
--slug "products" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Regions" \
--slug "regions" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Shippers" \
--slug "shippers" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Suppliers" \
--slug "suppliers" \
--parent "$base" \
"$base"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Territories" \
--slug "territories" \
--parent "$base" \
"$base"

popd