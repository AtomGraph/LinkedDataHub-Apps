#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/ ../../../certs/martynas.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$(realpath -s "$2")"
cert_password="$3"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pushd . && cd "$SCRIPT_ROOT"

parent=$(
./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Copenhagen" \
--slug "copenhagen" \
--parent "$base" \
"$request_base"
)

if [ -z "$request_base" ] ; then
    request_parent="$parent"
else
    request_parent=$(echo "$parent" | sed -e "s|$base|$request_base|g")
fi

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Places" \
--slug "places" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Bicycle parkings" \
--slug "bicycle-parkings" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Charging stations" \
--slug "charging-stations" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Libraries" \
--slug "libraries" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Parking facilities" \
--slug "parking-facilities" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Playgrounds" \
--slug "playgrounds" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Schools" \
--slug "schools" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Sport centers" \
--slug "sports-centers" \
--parent "$parent" \
"$request_parent"

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Public toilets" \
--slug "public-toilets" \
--parent "$parent" \
"$request_parent"

popd