#!/bin/bash

if [ "$#" -ne 5 ]; then
  echo "Usage:   $0" '$cert_pem_file $cert_password $pwd $abs_filename' >&2
  echo "Example: $0" 'https://linkeddatahub.com/my-context/my-dataspace/ ../../certs/martynas.stage.localhost.pem Password /folder /folder/file.ttl' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"
pwd="$4"
filename="$5"

path="${filename#*$pwd/}" # strip the leading $pwd/
extension="${filename##*.}"

case "$extension" in
  xsl)
    content_type="text/xsl"
    ;;
  png)
    content_type="image/png"
    ;;
  jpg)
    content_type="image/jpg"
    ;;
  svg)
    content_type="image/svg+xml"
    ;;
  webm)
    content_type="video/webm"
    ;;
esac

[ -z "$content_type" ] && echo "Unrecognized file extension of ${filename}, skipping file" && exit 1

title="${filename##*/}" # strip folders

pushd . && cd "$SCRIPT_ROOT/imports"

./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "${title}" \
--file "${filename}" \
--file-content-type "${content_type}"

popd