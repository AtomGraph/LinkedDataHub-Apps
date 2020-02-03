#!/bin/bash

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0 cert_pem_file cert_password" >&2
  echo "Example: $0" 'https://linkeddatahub.com/my-context/my-dataspace/ ../../certs/martynas.stage.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"

pwd=$(realpath -s "$PWD")

webid_uri=$("$SCRIPT_ROOT"/webid-uri.sh "$cert_pem_file" "$cert_password")

pushd . && cd "$SCRIPT_ROOT/admin/acl"

# documents 

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration" \
--agent "${webid_uri}" \
--to "${base}administration/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - ACL" \
--agent "${webid_uri}" \
--to "${base}administration/acl/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - Sitemap" \
--agent "${webid_uri}" \
--to "${base}administration/sitemap/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - Sitemap - Using LDT" \
--agent "${webid_uri}" \
--to "${base}administration/sitemap/using-ldt-templates/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - Sitemap - Built-ins" \
--agent "${webid_uri}" \
--to "${base}administration/sitemap/built-ins/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - Model" \
--agent "${webid_uri}" \
--to "${base}administration/model/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Administration - Model - Built-ins" \
--agent "${webid_uri}" \
--to "${base}administration/model/built-ins/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Tutorials" \
--agent "${webid_uri}" \
--to "${base}tutorials/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Tutorials - Create dataspace" \
--agent "${webid_uri}" \
--to "${base}tutorials/create-dataspace/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Tutorials - Import CSV data" \
--agent "${webid_uri}" \
--to "${base}tutorials/import-csv-data/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Tutorials - Import RDF data" \
--agent "${webid_uri}" \
--to "${base}tutorials/import-rdf-data/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Usage" \
--agent "${webid_uri}" \
--to "${base}usage/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Usage - Import data" \
--agent "${webid_uri}" \
--to "${base}usage/import-data/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Usage - Query data" \
--agent "${webid_uri}" \
--to "${base}usage/query-data/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write About" \
--agent "${webid_uri}" \
--to "${base}about/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Command line interface" \
--agent "${webid_uri}" \
--to "${base}command-line-interface/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Dataset structure" \
--agent "${webid_uri}" \
--to "${base}dataset-structure/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Getting started" \
--agent "${webid_uri}" \
--to "${base}getting-started/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write HTTP API" \
--agent "${webid_uri}" \
--to "${base}http-api/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Manage apps" \
--agent "${webid_uri}" \
--to "${base}manage-apps/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write User interface" \
--agent "${webid_uri}" \
--to "${base}user-interface/" \
--write

./create-authorization.sh \
-b "${base}admin/" \
-f "${cert_pem_file}" \
-p "${cert_password}" \
--label "Write Configuration" \
--agent "${webid_uri}" \
--to "${base}configuration/" \
--write

popd