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

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select categories" \
  --slug "select-categories" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select categories" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-categories.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Categories" \
  --slug "categories" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Category view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$container"

# customers

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select customers" \
  --slug "select-customers" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select customers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-customers.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Customers" \
  --slug "customers" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Customer view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# employees

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select employees" \
  --slug "select-employees" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select employees" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-employees.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Employees" \
  --slug "employees" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Employee view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$container"

# orders

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select orders" \
  --slug "select-orders" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select orders" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-orders.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Orders" \
  --slug "orders" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Order view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# products

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select products" \
  --slug "select-products" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select products" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-products.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Products" \
  --slug "products" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Product view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# regions

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select regions" \
  --slug "select-regions" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select regions" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-regions.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Regions" \
  --slug "regions" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Region view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  "$container"

# shippers

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select shippers" \
  --slug "select-shippers" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select shippers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-shippers.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Shippers" \
  --slug "shippers" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Shipper view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  "$container"

# suppliers

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select suppliers" \
  --slug "select-suppliers" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select suppliers" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-suppliers.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Suppliers" \
  --slug "suppliers" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Supplier view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

# territories

query_doc=$(./create-item.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select territories" \
  --slug "select-territories" \
  --container "${base}queries/"
)

query_id="this"

./add-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select territories" \
  --fragment "$query_id" \
  --query-file "$pwd/queries/select-territories.rq" \
  "$query_doc"

container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Territories" \
  --slug "territories" \
  --parent "$base"
)

view_id="view"

./add-query-view.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Territory view" \
  --fragment "$view_id" \
  --query "${query_doc}#${query_id}" \
  "$container"

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "${container}#${view_id}" \
  --mode "https://w3id.org/atomgraph/client#TableMode" \
  "$container"

popd || exit
