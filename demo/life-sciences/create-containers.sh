#!/bin/bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$request_base]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password' >&2
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
  "${request_base}service"
)

uniprot_service_doc="${base}services/uniprot/"

uniprot_service_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$uniprot_service_doc")

uniprot_service=$(echo "$uniprot_service_ntriples" | sed -rn "s/<${uniprot_service_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

select_proteins_doc=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Proteins" \
  --query-file "${pwd}/queries/uniprot/select-proteins.rq" \
  --service "$uniprot_service" \
  "${request_base}service"
)

select_proteins_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$select_proteins_doc")

select_proteins=$(echo "$select_proteins_ntriples" | sed -rn "s/<${select_proteins_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

protein_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Proteins" \
  --slug "proteins" \
  --parent "$uniprot_container" \
  "${request_base}service")

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --first "$select_proteins" \
  "$protein_container"

select_genes_doc=$(
./create-select.sh  \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Genes" \
  --query-file "${pwd}/queries/uniprot/select-genes.rq" \
  --service "$uniprot_service" \
  "${request_base}service"
)

select_genes_ntriples=$(./get-document.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --accept 'application/n-triples' \
  "$select_genes_doc")

select_genes=$(echo "$select_genes_ntriples" | sed -rn "s/<${select_genes_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p")

gene_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --title "Genes" \
  --slug "genes" \
  --parent "$uniprot_container" \
  "${request_base}service")

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --first "$select_genes" \
  "$gene_container"

popd || exit