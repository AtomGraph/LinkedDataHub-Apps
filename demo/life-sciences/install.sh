#!/bin/bash

if [ "$#" -ne 3 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../LinkedDataHub/certs/owner.p12.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

cd admin

printf "\n### Creating authorization to make the app public\n\n"

./make-public.sh "$base" "$cert_pem_file" "$cert_password"

cd ..

printf "\n### Creating containers\n\n"

./create-containers.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Creating services\n\n"

./create-services.sh "$base" "$cert_pem_file" "$cert_password"

printf "\n### Creating charts\n\n"

./create-charts.sh "$base" "$cert_pem_file" "$cert_password"