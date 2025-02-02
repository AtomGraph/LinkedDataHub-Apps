#!/usr/bin/env bash

[ -z "$SCRIPT_ROOT" ] && echo "Need to set SCRIPT_ROOT" && exit 1;

if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
  echo "Usage:   $0" '$base $cert_pem_file $cert_password [$proxy]' >&2
  echo "Example: $0" 'https://localhost:4443/ ../../../ssl/owner/cert.pem Password [https://localhost:5443/]' >&2
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

pwd=$(realpath "$PWD")

pushd . && cd "$SCRIPT_ROOT"

uniprot_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Uniprot" \
  --slug "uniprot" \
  --parent "$base"
)

uniprot_service_doc="${base}services/uniprot/"

uniprot_service_ntriples=$(./get.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$uniprot_service_doc")

uniprot_service=$(echo "$uniprot_service_ntriples" | sed -rn "s/<${uniprot_service_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p" | head -1)

select_proteins_doc=$(
./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Proteins" \
  --query-file "${pwd}/queries/uniprot/select-proteins.rq" \
  --service "$uniprot_service"
)

select_proteins_ntriples=$(./get.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_proteins_doc")

select_proteins=$(echo "$select_proteins_ntriples" | sed -rn "s/<${select_proteins_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p"| head -1)

protein_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Proteins" \
  --slug "proteins" \
  --parent "$uniprot_container"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$protein_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "$select_proteins" \
  "$protein_container"

select_genes_doc=$(
./create-select.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Genes" \
  --query-file "${pwd}/queries/uniprot/select-genes.rq" \
  --service "$uniprot_service"
)

select_genes_ntriples=$(./get.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --accept 'application/n-triples' \
  "$select_genes_doc")

select_genes=$(echo "$select_genes_ntriples" | sed -rn "s/<${select_genes_doc//\//\\/}> <http:\/\/xmlns.com\/foaf\/0.1\/primaryTopic> <(.*)> \./\1/p"| head -1)

gene_container=$(./create-container.sh \
  -b "$base" \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --title "Genes" \
  --slug "genes" \
  --parent "$uniprot_container"
)

./remove-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  "$gene_container"

./append-content.sh \
  -f "$cert_pem_file" \
  -p "$cert_password" \
  --proxy "$proxy" \
  --value "$select_genes" \
  "$gene_container"

popd || exit