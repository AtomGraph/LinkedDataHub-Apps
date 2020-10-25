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

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT/admin/sitemap"

./create-describe.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#DescribeCustomer" \
--label "Describe customer" \
--slug describe-customer \
--query-file "$pwd/queries/describe-customer.rq"

./create-describe.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#DescribeEmployee" \
--label "Describe employee" \
--slug describe-employee \
--query-file "$pwd/queries/describe-employee.rq"

./create-describe.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#DescribeOrder" \
--label "Describe order" \
--slug describe-order \
--query-file "$pwd/queries/describe-order.rq"

./create-describe.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#DescribeSupplier" \
--label "Describe supplier" \
--slug describe-supplier \
--query-file "$pwd/queries/describe-supplier.rq"

popd