#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file="$(realpath -s "$2")"
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

pushd . && cd "$SCRIPT_ROOT"

parent=$(
./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Copenhagen" \
  --slug "copenhagen" \
  --parent "$base"
)

if [ -z "$parent" ]; then
    exit 1
fi

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Places" \
  --slug "places" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Bicycle parkings" \
  --slug "bicycle-parkings" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Charging stations" \
  --slug "charging-stations" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Libraries" \
  --slug "libraries" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Parking facilities" \
  --slug "parking-facilities" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Playgrounds" \
  --slug "playgrounds" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Schools" \
  --slug "schools" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Sport centers" \
  --slug "sports-centers" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Public toilets" \
  --slug "public-toilets" \
  --parent "$parent" \
  --mode "https://w3id.org/atomgraph/client#MapMode"

popd