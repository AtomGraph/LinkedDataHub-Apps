#!/bin/bash

if [ "$#" -ne 5 ]; then
  echo "Usage:   $0 cert_pem_file cert_password pwd abs_filename" >&2
  echo "Example: $0" 'https://linkeddatahub.com/my-context/my-dataspace/ ../../certs/martynas.stage.localhost.pem Password /folder /folder/file.ttl' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"
pwd="$4"
filename="$5"

path="${filename%.*}" # strip the extension
path="${path#*$pwd/}" # strip the leading $pwd/
path="${path}/" # add trailing slash

pushd . && cd "$SCRIPT_ROOT"

printf "\n### Updating %s\n" "${base}${path}"

cat "${filename}" | turtle --base="${base}" | "$SCRIPT_ROOT"/update-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
-t "application/n-triples" \
"${base}${path}"

popd