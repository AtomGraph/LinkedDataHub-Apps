#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$(realpath -s "$2")"
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"

# categories

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Categories" \
  --slug "categories" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-categories"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select categories" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-categories.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$container"

# customers

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Customers" \
  --slug "customers" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-customers"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select customers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-customers.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# employees

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Employees" \
  --slug "employees" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-employees"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select employees" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-employees.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$container"

# orders

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Orders" \
  --slug "orders" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-orders"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select orders" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-orders.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# products

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Products" \
  --slug "products" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-products"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select products" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-products.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# regions

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Regions" \
  --slug "regions" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-regions"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select regions" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-regions.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  "$container"

# shippers

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Shippers" \
  --slug "shippers" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-shippers"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select shippers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-shippers.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  "$container"

# suppliers

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Suppliers" \
  --slug "suppliers" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-suppliers"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select suppliers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-suppliers.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# territories

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Territories" \
  --slug "territories" \
  --parent "$base"
)

./remove-block.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

query_id="select-territories"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select territories" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-territories.rq" \
  "$container"

./add-view-block.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --query "${container}#${query_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

popd || exit
