#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://linkeddatahub.com/atomgraph/app/ ../../../certs/martynas.localhost.pem Password' >&2
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

pwd=$(realpath -s "$PWD")

pushd . && cd "$SCRIPT_ROOT"/imports

# create queries

query_container="${request_base}queries/"

places_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Places" \
--query-file "$pwd/queries/copenhagen/places.rq" \
"$query_container")

places_query_doc=$(echo "$places_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

places_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$places_query_doc")

popd > /dev/null

places_query=$(echo "$places_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# upload CSV files

file_container="${request_base}files/"

places_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Places" \
--file "$pwd/files/copenhagen/places.csv" \
--file-content-type "text/csv" \
"$file_container")

places_file_doc=$(echo "$places_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

places_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$places_file_doc")

popd > /dev/null

places_file=$(echo "$places_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# start imports

import_container="${request_base}imports/"

echo "PLACES_QUERY: $places_query"
echo "PLACES_FILE: $places_file"

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Places" \
--action "${base}copenhagen/places/" \
--query "$places_query" \
--file "$places_file" \
--delimiter "," \
"$import_container"

exit 1

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Places" \
--query-file "$pwd/queries/copenhagen/places.rq" \
--file "$pwd/files/copenhagen/places.csv" \
--action "${base}copenhagen/places/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Bicycle parkings" \
--query-file "$pwd/queries/copenhagen/bicycle-parkings.rq" \
--file "$pwd/files/copenhagen/bicycle-parkings.csv" \
--action "${base}copenhagen/bicycle-parkings/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Electric car chargers" \
--query-file "$pwd/queries/copenhagen/charging-stations.rq" \
--file "$pwd/files/copenhagen/charging-stations.csv" \
--action "${base}copenhagen/charging-stations/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Libraries" \
--query-file "$pwd/queries/copenhagen/libraries.rq" \
--file "$pwd/files/copenhagen/libraries.csv" \
--action "${base}copenhagen/libraries/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Parking facilities" \
--query-file "$pwd/queries/copenhagen/parking-facilities.rq" \
--file "$pwd/files/copenhagen/parking-facilities.csv" \
--action "${base}copenhagen/parking-facilities/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Playgrounds" \
--query-file "$pwd/queries/copenhagen/playgrounds.rq" \
--file "$pwd/files/copenhagen/playgrounds.csv" \
--action "${base}copenhagen/playgrounds/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Schools" \
--query-file "$pwd/queries/copenhagen/schools.rq" \
--file "$pwd/files/copenhagen/schools.csv" \
--action "${base}copenhagen/schools/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Sports centers" \
--query-file "$pwd/queries/copenhagen/sports-centers.rq" \
--file "$pwd/files/copenhagen/sports-centers.csv" \
--action "${base}copenhagen/sports-centers/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Public toilets" \
--query-file "$pwd/queries/copenhagen/public-toilets.rq" \
--file "$pwd/files/copenhagen/public-toilets.csv" \
--action "${base}copenhagen/public-toilets/"

./import-csv.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--request-base "$request_base" \
--title "Denmark postal areas" \
--query-file "$pwd/queries/postal-areas.rq" \
--file "$pwd/files/postal-areas.csv" \
--action "${base}postal-areas/"

popd