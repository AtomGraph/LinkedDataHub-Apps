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

# The admin dataspace of a URI: the same host with the admin. subdomain prefix.
ldh_app_admin_uri() {
    echo "$1" | sed 's|://|://admin.|'
}

# Installs $1/ns.ttl into the admin app's ontologies/namespace/ document, which LinkedDataHub serves
# at ${LDH_BASE}ns: resets the document with $1/patch-ontology.ru (everything but its own description),
# appends ns.ttl with @base <${LDH_BASE}ns> so its : prefix resolves to the end-user namespace, and
# clears the ontology from memory so it reloads. Re-running converges.
ldh_app_import_ns() {
    local model_dir="$1"
    local admin_base admin_proxy ontology_doc
    admin_base=$(ldh_app_admin_uri "$LDH_BASE")
    admin_proxy=$(ldh_app_admin_uri "$LDH_PROXY")
    ontology_doc="${admin_base}ontologies/namespace/"

    printf "Resetting namespace ontology document: %s\n" "$ontology_doc"
    { echo "BASE <${ontology_doc}>"; cat "$model_dir/patch-ontology.ru"; } | ldh patch \
        --proxy "$admin_proxy" \
        "$ontology_doc"

    printf "Appending ns.ttl to the namespace ontology\n"
    { echo "@base <${LDH_BASE}ns> ."; cat "$model_dir/ns.ttl"; } | ldh post \
        --proxy "$admin_proxy" \
        -t text/turtle \
        "$ontology_doc"

    printf "Clearing ontology from memory: %sns#\n" "$LDH_BASE"
    ldh admin clear ontology \
        -b "$admin_base" \
        --proxy "$admin_proxy" \
        --ontology "${LDH_BASE}ns#"
}

# Runs one ldh import csv per row of the manifest $2 — query_filename,csv_filename,target,title, paths
# relative to $1: it adds the CONSTRUCT query, uploads the CSV into the target document and creates
# the import that maps one into the other. Every run creates a new import; the documents the imports
# write are the same, so the data converges.
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
            "${LDH_BASE}${target_path}" < /dev/null
    done < <(tail -n +2 "$manifest")
}
