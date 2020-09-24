#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password' >&2
  echo "Example: $0" 'https://localhost:4443/demo/skos/ ../../../../../certs/martynas.stage.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"/admin/acl

sha1sum=$(sha1sum "$pwd"/../../files/skos.xsl | cut -d ' ' -f 1)

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Public PermID XSLT stylesheet" \
--agent-class http://xmlns.com/foaf/0.1/Agent \
--to "${base}uploads/${sha1sum}/" \
--read

popd