#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password' >&2
  echo "Example: $0" 'https://linkeddatahub.com:4443/demo/city-graph/ ../../../../../certs/martynas.stage.linkeddatahub.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT/admin/acl"

./add-agent-to-group.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--agent "https://linkeddatahub.com:4443/admin/acl/agents/731a6d63-9396-4f9b-94c6-54cce1d4325f/#this" \
"${base}admin/acl/groups/owners/"

popd