#!/usr/bin/env bash

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/city-graph/ ../../../../../certs/martynas.stage.localhost.pem Password [https://localhost:5443/]' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath "$2")
cert_password="$3"

if [ -n "$4" ]; then
    proxy="$4"
else
    proxy="$base"
fi

admin_uri() {
    local uri="$1"
    echo "$uri" | sed 's|://|://admin.|'
}

admin_base=$(admin_uri "$base")
admin_proxy=$(admin_uri "$proxy")

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#BicycleParking" \
  --label "Bicycle parking" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#ChargingStation" \
  --label "Charging station" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
    --proxy "$admin_proxy" \
  --uri "${base}ns#Library" \
  --label "Library" \
  --sub-class-of "https://schema.org/Library" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#ParkingFacility" \
  --label "Parking facility" \
  --sub-class-of "https://schema.org/ParkingFacility" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#Place" \
  --label "Place" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#Playground" \
  --label "Playground" \
  --sub-class-of "https://schema.org/Playground" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#School" \
  --label "School" \
  --sub-class-of "https://schema.org/School" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#SportsCenter" \
  --label "Sports center" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${admin_base}ontologies/namespace/"

add-class.sh \
  -b "$admin_base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$admin_proxy" \
  --uri "${base}ns#PublicToilet" \
  --label "Toilet" \
  --sub-class-of "http://schema.org/PublicToilet" \
  "${admin_base}ontologies/namespace/"
