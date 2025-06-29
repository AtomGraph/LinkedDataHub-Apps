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

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#BicycleParking" \
  --label "Bicycle parking" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#ChargingStation" \
  --label "Charging station" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
    --proxy "$proxy" \
  --uri "${base}ns#Library" \
  --label "Library" \
  --sub-class-of "https://schema.org/Library" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#ParkingFacility" \
  --label "Parking facility" \
  --sub-class-of "https://schema.org/ParkingFacility" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#Place" \
  --label "Place" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#Playground" \
  --label "Playground" \
  --sub-class-of "https://schema.org/Playground" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#School" \
  --label "School" \
  --sub-class-of "https://schema.org/School" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#SportsCenter" \
  --label "Sports center" \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${base}admin/ontologies/namespace/"

add-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --uri "${base}ns#PublicToilet" \
  --label "Toilet" \
  --sub-class-of "http://schema.org/PublicToilet" \
  "${base}admin/ontologies/namespace/"
