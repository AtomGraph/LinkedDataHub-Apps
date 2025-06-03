#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/skos/ ../../../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pwd=$(realpath "$PWD")

pushd . && cd "$SCRIPT_ROOT"/admin/acl

sha1sum=$(sha1sum "$pwd"/../../files/skos.xsl | cut -d ' ' -f 1)

./create-authorization.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --label "Public SKOS XSLT stylesheet" \
  --agent-class http://xmlns.com/foaf/0.1/Agent \
  --to "${base}uploads/${sha1sum}/" \
  --read

./create-authorization.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
    --proxy "$proxy" \
  --label "Read access to graph items" \
  --agent-class "http://www.w3.org/ns/auth/acl#AuthenticatedAgent" \
  --to-all-in "https://www.w3.org/ns/ldt/document-hierarchy#Item" \
  --read

popd