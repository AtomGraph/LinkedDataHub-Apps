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

select_categories_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select categories" \
  --slug select-categories \
  --query-file "$pwd/queries/select-categories.rq"
)

select_categories_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_categories_doc"
)

select_categories=$(echo "$select_categories_ntriples" | sed -rn "s/<${select_categories_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

category_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Categories" \
  --slug "categories" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$category_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_categories" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$category_container"


select_customers_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select customers" \
  --slug select-customers \
  --query-file "$pwd/queries/select-customers.rq"
)

select_customers_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_customers_doc"
)

select_customers=$(echo "$select_customers_ntriples" | sed -rn "s/<${select_customers_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

customer_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Customers" \
  --slug "customers" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$customer_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_customers" \
  "$customer_container"


select_employees_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select employees" \
  --slug select-employees \
  --query-file "$pwd/queries/select-employees.rq"
)

select_employees_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_employees_doc"
)

select_employees=$(echo "$select_employees_ntriples" | sed -rn "s/<${select_employees_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

employees_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Employees" \
  --slug "employees" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$employees_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_employees" \
  --mode "https://w3id.org/atomgraph/client#GridMode" \
  "$employees_container"


select_orders_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select orders" \
  --slug select-orders \
  --query-file "$pwd/queries/select-orders.rq"
)

select_orders_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_orders_doc"
)

select_orders=$(echo "$select_orders_ntriples" | sed -rn "s/<${select_orders_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

order_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Orders" \
  --slug "orders" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$order_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_orders" \
  "$order_container"


select_products_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select products" \
  --slug select-products \
  --query-file "$pwd/queries/select-products.rq"
)

select_products_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_products_doc"
)

select_products=$(echo "$select_products_ntriples" | sed -rn "s/<${select_products_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

product_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Products" \
  --slug "products" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$product_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_products" \
  "$product_container"


select_regions_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select regions" \
  --slug select-regions \
  --query-file "$pwd/queries/select-regions.rq"
)

select_regions_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_regions_doc"
)

select_regions=$(echo "$select_regions_ntriples" | sed -rn "s/<${select_regions_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

region_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Regions" \
  --slug "regions" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$region_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_regions" \
  "$region_container"


select_shippers_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select shippers" \
  --slug select-shippers \
  --query-file "$pwd/queries/select-shippers.rq"
)

select_shippers_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_shippers_doc"
)

select_shippers=$(echo "$select_shippers_ntriples" | sed -rn "s/<${select_shippers_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

shipper_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Shippers" \
  --slug "shippers" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$shipper_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_shippers" \
  "$shipper_container"


select_suppliers_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select suppliers" \
  --slug select-suppliers \
  --query-file "$pwd/queries/select-suppliers.rq"
)

select_suppliers_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_suppliers_doc"
)

select_suppliers=$(echo "$select_suppliers_ntriples" | sed -rn "s/<${select_suppliers_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

supplier_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Suppliers" \
  --slug "suppliers" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$supplier_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_suppliers" \
  "$supplier_container"


select_territories_doc=$(./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Select territories" \
  --slug select-territories \
  --query-file "$pwd/queries/select-territories.rq"
)

select_territories_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_territories_doc"
)

select_territories=$(echo "$select_territories_ntriples" | sed -rn "s/<${select_territories_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

territory_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Territories" \
  --slug "territories" \
  --parent "$base"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$territory_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --first "$select_territories" \
  "$territory_container"

popd || exit
