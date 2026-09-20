#!/usr/bin/env bash
# Creates the app's authorizations on its admin application: public read of the uploaded layout
# stylesheet, and read access to every item for authenticated agents.
set -euo pipefail

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../../../LinkedDataHub/ssl/owner/keystore.p12 Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_file=$(realpath "$2")
cert_password="$3"
proxy="${4:-$base}"

acl_dir="$(cd "$(dirname "$0")" && pwd)"

admin_uri() {
    echo "$1" | sed 's|://|://admin.|'
}

admin_base=$(admin_uri "$base")
admin_proxy=$(admin_uri "$proxy")

sha1sum=$(shasum -a 1 "$acl_dir/../../layout.xsl" | cut -d ' ' -f 1)

ldh admin create authorization \
  -b "$admin_base" \
  -f "$cert_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --label "Public layout XSLT stylesheet" \
  --agent-class http://xmlns.com/foaf/0.1/Agent \
  --to "${base}uploads/${sha1sum}/" \
  --read

ldh admin create authorization \
  -b "$admin_base" \
  -f "$cert_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --label "Read access to graph items" \
  --agent-class "http://www.w3.org/ns/auth/acl#AuthenticatedAgent" \
  --to-all-in "https://www.w3.org/ns/ldt/document-hierarchy#Item" \
  --read
