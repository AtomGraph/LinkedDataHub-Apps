#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/admin/ ../../../../../../certs/martynas.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT/admin/sitemap"

./create-describe.sh \
-b "${base}admin/" \
-f "$cert_pem_file" \
-p "$cert_password" \
--uri "${base}ns/templates#DescribePlace" \
--label "Describe place" \
--slug describe-place \
--query-file "$pwd/queries/describe-place.rq" \
"${request_base}admin/sitemap/queries/"

popd