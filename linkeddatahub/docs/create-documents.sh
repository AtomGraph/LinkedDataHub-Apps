#!/bin/bash

[ -z "$JENA_HOME" ] && echo "Need to set JENA_HOME" && exit 1;

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0 base cert_pem_file cert_password" >&2
  echo "Example: $0" 'https://linkeddatahub.com/my-context/my-dataspace/ linkeddatahub.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"

cat administration.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/"

cat administration/acl.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/acl/"

cat administration/sitemap.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/sitemap/"

cat administration/sitemap/using-ldt-templates.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/sitemap/using-ldt-templates/"

cat administration/sitemap/built-ins.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/sitemap/built-ins/"

cat administration/model.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/model/"

cat administration/model/built-ins.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}administration/model/built-ins/"

cat tutorials.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}tutorials/"

cat tutorials/create-dataspace.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}tutorials/create-dataspace/"

cat tutorials/import-csv-data.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}tutorials/import-csv-data/"

cat tutorials/import-rdf-data.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}tutorials/import-rdf-data/"

cat usage.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}usage/"

cat usage/import-data.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}usage/import-data/"

cat usage/query-data.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}usage/query-data/"

cat about.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}about/"

cat command-line-interface.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}command-line-interface/"

cat dataset-structure.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}dataset-structure/"

cat getting-started.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}getting-started/"

cat http-api.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}http-api/"

cat manage-apps.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}manage-apps/"

cat user-interface.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}user-interface/"

cat configuration.ttl | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}configuration/"