#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/demo/city-graph/ ../../../../../certs/martynas.stage.localhost.pem Password' >&2
  echo "Note: special characters such as $ need to be escaped in passwords!" >&2
  exit 1
fi

base="$1"
cert_pem_file=$(realpath -s "$2")
cert_password="$3"

if [ -n "$4" ]; then
    request_base="$4"
else
    request_base="$base"
fi

pushd . && cd "$SCRIPT_ROOT/admin/model"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#BicycleParking" \
  --label "Bicycle parking" \
  --slug bicycle-parking \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#ChargingStation" \
  --label "Charging station" \
  --slug charging-station \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#Library" \
  --label "Library" \
  --slug library \
  --sub-class-of "https://schema.org/Library" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#ParkingFacility" \
  --label "Parking facility" \
  --slug parking-facility \
  --sub-class-of "https://schema.org/ParkingFacility" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#Place" \
  --label "Place" \
  --slug place \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#Playground" \
  --label "Playground" \
  --slug playground \
  --sub-class-of "https://schema.org/Playground" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#School" \
  --label "School" \
  --slug school \
  --sub-class-of "https://schema.org/School" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#SportsCenter" \
  --label "Sports center" \
  --slug sports-center \
  --sub-class-of "https://schema.org/CivicStructure" \
  "${request_base}admin/model/ontologies/namespace/"

./create-class.sh \
  -b "${base}admin/" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --uri "{$base}ns#PublicToilet" \
  --label "Toilet" \
  --slug public-toilet \
  --sub-class-of "http://schema.org/PublicToilet" \
  "${request_base}admin/model/ontologies/namespace/"

popd