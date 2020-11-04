#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Usage:   $0" '$base' >&2
  echo "Example: $0" 'https://localhost/' >&2
  exit 1
fi

base="$1"

#cat ./files/categories.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/categories.rq":/tmp/categories.rq atomgraph/csv2rdf /tmp/categories.rq "$base" > ./files/categories.nt

#cat ./files/customers.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/customers.rq":/tmp/customers.rq atomgraph/csv2rdf /tmp/customers.rq "$base" > ./files/customers.nt

#cat ./files/employee_territories.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/employee_territories.rq":/tmp/employee_territories.rq atomgraph/csv2rdf /tmp/employee_territories.rq "$base" > ./files/employee_territories.nt

#cat ./files/employees.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/employees.rq":/tmp/employees.rq atomgraph/csv2rdf /tmp/employees.rq "$base" > ./files/employees.nt

cat ./files/order_details.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/order_details.rq":/tmp/order_details.rq atomgraph/csv2rdf /tmp/order_details.rq "$base" > ./files/order_details.nt

cat ./files/orders.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/orders.rq":/tmp/orders.rq atomgraph/csv2rdf /tmp/orders.rq "$base" > ./files/orders.nt

#cat ./files/products.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/products.rq":/tmp/products.rq atomgraph/csv2rdf /tmp/products.rq "$base" > ./files/products.nt

#cat ./files/regions.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/regions.rq":/tmp/regions.rq atomgraph/csv2rdf /tmp/regions.rq "$base" > ./files/regions.nt

#cat ./files/shippers.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/shippers.rq":/tmp/shippers.rq atomgraph/csv2rdf /tmp/shippers.rq "$base" > ./files/shippers.nt

#cat ./files/suppliers.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/suppliers.rq":/tmp/suppliers.rq atomgraph/csv2rdf /tmp/suppliers.rq "$base" > ./files/suppliers.nt

#cat ./files/territories.csv | docker run -i -a stdin -a stdout -a stderr -v "$(pwd)/queries/imports/territories.rq":/tmp/territories.rq atomgraph/csv2rdf /tmp/territories.rq "$base" > ./files/territories.nt