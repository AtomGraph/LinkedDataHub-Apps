#!/usr/bin/env bash
# Shared by every install.sh in this repository. Sourced, not run.
#
# The ldh CLI reads its connection from the environment — LDH_BASE, LDH_CERT_FILE, LDH_CERT_PASSWORD
# and LDH_PROXY — so the installers put no credential on any command line: nothing to escape, nothing
# in the process list. `make install` prompts for the four and exports them; an unattended run exports
# them itself and runs install.sh directly.

# Fails with a message naming the variable that is missing, resolves the keystore path and defaults
# the proxy to the base itself, as the installers always did.
ldh_app_require_env() {
    : "${LDH_BASE:?Base URI of the dataspace, e.g. https://localhost:4443/}"
    : "${LDH_CERT_FILE:?PKCS12 keystore of the owner, e.g. ../../../LinkedDataHub/ssl/owner/keystore.p12}"
    : "${LDH_CERT_PASSWORD:?Password of the keystore}"
    command -v ldh >/dev/null || { echo "ldh CLI not found on PATH — see README.md" >&2; exit 1; }
    LDH_CERT_FILE=$(realpath "$LDH_CERT_FILE")
    export LDH_CERT_FILE
    export LDH_PROXY="${LDH_PROXY:-$LDH_BASE}"
}

# Prints the banner of an install step.
ldh_app_step() {
    printf "\n### %s\n\n" "$1"
}

# Installs $1/ns.ttl as the dataspace's namespace ontology, which LinkedDataHub serves at ${LDH_BASE}ns:
# ldh resolves the file against the ontology IRI the base advertises, replaces the admin app's
# ontologies/namespace/ document keeping its own description and the ontology's header, and clears the
# ontology cache. Re-running converges: a class or property removed from ns.ttl is gone.
ldh_app_import_ns() {
    local model_dir="$1"

    printf "Installing the namespace ontology from %s\n" "$model_dir/ns.ttl"
    ldh admin import ontology --file "$model_dir/ns.ttl"
}

# Runs one ldh import csv per row of the manifest $2 — query_filename,csv_filename,target,title, paths
# relative to $1: it adds the CONSTRUCT query, uploads the CSV into the target document and creates
# the import that maps one into the other, then waits for the import to end and fails if it did. Every
# run creates a new import; the documents the imports write are the same, so the data converges.
ldh_app_import_csv() {
    local app_dir="$1" manifest="$2"
    local query_filename csv_filename target_path title
    while IFS=, read -r query_filename csv_filename target_path title; do
        [ -n "$query_filename" ] || continue
        printf "Importing %s into %s\n" "$csv_filename" "${LDH_BASE}${target_path}"
        ldh import csv \
            --title "$title" \
            --query-file "$app_dir/$query_filename" \
            --csv-file "$app_dir/$csv_filename" \
            --wait \
            "${LDH_BASE}${target_path}" < /dev/null
    done < <(tail -n +2 "$manifest")
}
