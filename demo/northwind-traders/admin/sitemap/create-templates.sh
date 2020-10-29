#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/admin/ ../../../../../../certs/martynas.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

pushd . && cd "$SCRIPT_ROOT/admin/sitemap"

./create-template.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#CustomerItem" \
--label "Customer item" \
--slug customer-item \
--extends "${base}ns/templates#Document" \
--match "/customers/{id}/" \
--query "${base}ns/templates#DescribeCustomer" \
--is-defined-by "${base}ns/templates#"

./create-template.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#EmployeeItem" \
--label "Employee item" \
--slug employee-item \
--extends "${base}ns/templates#Document" \
--match "/employees/{id}/" \
--query "${base}ns/templates#DescribeEmployee" \
--is-defined-by "${base}ns/templates#"

./create-template.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#OrderItem" \
--label "Order item" \
--slug order-item \
--extends "${base}ns/templates#Document" \
--match "/orders/{id}/" \
--query "${base}ns/templates#DescribeOrder" \
--is-defined-by "${base}ns/templates#"

./create-template.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#SupplierItem" \
--label "Supplier item" \
--slug supplier-item \
--extends "${base}ns/templates#Document" \
--match "/suppliers/{id}/" \
--query "${base}ns/templates#DescribeSupplier" \
--is-defined-by "${base}ns/templates#"

popd