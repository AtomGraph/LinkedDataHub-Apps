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

arr_csv=() 
while IFS= read -r line 
do
    arr_csv+=("$line")
done < imports.csv

echo "Displaying the contents of array mapped from csv file:"
index=0
for record in "${arr_csv[@]}"
do
    echo "Record at index-${index} : $record"
	((index++))
done


### CREATE QUERIES

query_container="${request_base}queries/"

# places

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

# bicycle parkings

bicycle_parkings_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Bicycle parkings" \
--query-file "$pwd/queries/copenhagen/bicycle-parkings.rq" \
"$query_container")

bicycle_parkings_query_doc=$(echo "$bicycle_parkings_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

bicycle_parkings_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$bicycle_parkings_query_doc")

popd > /dev/null

bicycle_parkings_query=$(echo "$bicycle_parkings_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# charging stations

charging_stations_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Charging stations" \
--query-file "$pwd/queries/copenhagen/charging-stations.rq" \
"$query_container")

charging_stations_query_doc=$(echo "$charging_stations_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

charging_stations_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$charging_stations_query_doc")

popd > /dev/null

charging_stations_query=$(echo "$charging_stations_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# libraries

libraries_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Libraries" \
--query-file "$pwd/queries/copenhagen/libraries.rq" \
"$query_container")

libraries_query_doc=$(echo "$libraries_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

libraries_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$libraries_query_doc")

popd > /dev/null

libraries_query=$(echo "$libraries_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# parking facilities

parking_facilities_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Parking facilities" \
--query-file "$pwd/queries/copenhagen/parking-facilities.rq" \
"$query_container")

parking_facilities_query_doc=$(echo "$parking_facilities_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

parking_facilities_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$parking_facilities_query_doc")

popd > /dev/null

parking_facilities_query=$(echo "$parking_facilities_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# playgrounds

playgrounds_query_doc=$(./create-query.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Playgrounds" \
--query-file "$pwd/queries/copenhagen/playgrounds.rq" \
"$query_container")

playgrounds_query_doc=$(echo "$playgrounds_query_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

playgrounds_query_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$playgrounds_query_doc")

popd > /dev/null

playgrounds_query=$(echo "$playgrounds_query_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

### UPLOAD CSV

file_container="${request_base}files/"

# places

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

# bicycle parkings

bicycle_parkings_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Bicycle parkings" \
--file "$pwd/files/copenhagen/bicycle-parkings.csv" \
--file-content-type "text/csv" \
"$file_container")

bicycle_parkings_file_doc=$(echo "$bicycle_parkings_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

bicycle_parkings_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$bicycle_parkings_file_doc")

popd > /dev/null

bicycle_parkings_file=$(echo "$bicycle_parkings_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# charging stations

charging_stations_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Charging stations" \
--file "$pwd/files/copenhagen/charging-stations.csv" \
--file-content-type "text/csv" \
"$file_container")

charging_stations_file_doc=$(echo "$charging_stations_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

charging_stations_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$charging_stations_file_doc")

popd > /dev/null

charging_stations_file=$(echo "$charging_stations_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# libraries

libraries_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Libraries" \
--file "$pwd/files/copenhagen/libraries.csv" \
--file-content-type "text/csv" \
"$file_container")

libraries_file_doc=$(echo "$libraries_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

libraries_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$libraries_file_doc")

popd > /dev/null

libraries_file=$(echo "$libraries_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# parking facilities

parking_facilities_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Places" \
--file "$pwd/files/copenhagen/parking-facilities.csv" \
--file-content-type "text/csv" \
"$file_container")

parking_facilities_file_doc=$(echo "$parking_facilities_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

parking_facilities_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$parking_facilities_file_doc")

popd > /dev/null

parking_facilities_file=$(echo "$parking_facilities_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

# playgrounds

playgrounds_file_doc=$(./create-file.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Playgrounds" \
--file "$pwd/files/copenhagen/playgrounds.csv" \
--file-content-type "text/csv" \
"$file_container")

playgrounds_file_doc=$(echo "$playgrounds_file_doc" | sed -e "s|$base|$request_base|g")

pushd . > /dev/null && cd "$SCRIPT_ROOT"

playgrounds_file_ntriples=$(./get-document.sh \
-f "$cert_pem_file" \
-p "$cert_password" \
--accept 'application/n-triples' \
"$playgrounds_file_doc")

popd > /dev/null

playgrounds_file=$(echo "$playgrounds_file_ntriples" | grep '<http://xmlns.com/foaf/0.1/primaryTopic>' | cut -d " " -f 3 | cut -d "<" -f 2 | cut -d ">" -f 1) # cut < > from URI

### START IMPORTS

import_container="${request_base}imports/"

# places

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

# bicycle parkings

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Bicycle parkings" \
--action "${base}copenhagen/bicycle-parkings/" \
--query "$bicycle_parkings_query" \
--file "$bicycle_parkings_file" \
--delimiter "," \
"$import_container"

# charging stations

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Charging stations" \
--action "${base}copenhagen/charging-stations/" \
--query "$charging_stations_query" \
--file "$charging_stations_file" \
--delimiter "," \
"$import_container"

# libraries

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Libraries" \
--action "${base}copenhagen/libraries/" \
--query "$libraries_query" \
--file "$libraries_file" \
--delimiter "," \
"$import_container"

# parking facilities

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Parking facilities" \
--action "${base}copenhagen/parking-facilities/" \
--query "$parking_facilities_query" \
--file "$parking_facilities_file" \
--delimiter "," \
"$import_container"

# playgrounds

./create-csv-import.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Playgrounds" \
--action "${base}copenhagen/playgrounds/" \
--query "$playgrounds_query" \
--file "$playgrounds_file" \
--delimiter "," \
"$import_container"

exit 1

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