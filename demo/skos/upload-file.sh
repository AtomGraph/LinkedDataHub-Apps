#!/usr/bin/env bash

if [ "$#" -ne 5 ] && [ "$#" -ne 6 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password $pwd $abs_filename content_type [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../ssl/owner/cert.pem Password /folder /folder/file.ttl 'text/css' [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$2"
cert_password="$3"
pwd="$4"
filename="$5"
content_type="$6"

if [ -n "$7" ]; then
    proxy="$7"
else
    proxy="$base"
fi

path="${filename#*$pwd/}" # strip the leading $pwd/
title="${filename##*/}" # strip folders

pushd . && cd "$SCRIPT_ROOT/imports"

./create-file.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "$title" \
  --file "$filename"

popd