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

pwd=$(realpath -s $PWD)

pushd . && cd "$SCRIPT_ROOT"

uniprot_container=$(./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Uniprot" \
--slug "uniprot" \
--parent "$base" \
"$request_base"
)

if [ -z "$request_base" ] ; then
    uniprot_request_container="$uniprot_container"
else
    uniprot_request_container=$(echo "$uniprot_container" | sed -e "s|$base|$request_base|g")
fi

# select_molecules=$(
# ./create-select.sh  \
# -b "$base" \
# -f "$cert_pem_file" \
# -p "$cert_password" \
# --title "Molecules" \
# --query-file "${pwd}/queries/chembl/select-molecules.rq" \
# --service "${base}services/chembl/#this" \
# "${request_base}queries/"
# )
# 
# ./create-container.sh \
# -b "$base" \
# -f "$cert_pem_file" \
# -p "$cert_password" \
# --title "ChEMBL molecules" \
# --slug "chembl-molecules" \
# --select "${select_molecules}#this" \
# --parent "$base" \
# "$request_base"

select_proteins=$(
./create-select.sh  \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Proteins" \
--query-file "${pwd}/queries/uniprot/select-proteins.rq" \
--service "${base}services/uniprot-enzymes/#this" \
"${request_base}queries/"
)

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Proteins" \
--slug "proteins" \
--select "${select_proteins}#this" \
--parent "$uniprot_container" \
"$uniprot_request_container"

select_genes=$(
./create-select.sh  \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Proteins" \
--query-file "${pwd}/queries/uniprot/select-genes.rq" \
--service "${base}services/uniprot-enzymes/#this" \
"${request_base}queries/"
)

./create-container.sh \
-b "$base" \
-f "$cert_pem_file" \
-p "$cert_password" \
--title "Genes" \
--slug "genes" \
--select "${select_genes}#this" \
--parent "$uniprot_container" \
"$uniprot_request_container"

popd
