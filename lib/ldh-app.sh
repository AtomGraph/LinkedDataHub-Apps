#!/usr/bin/env bash
# Shared by every install.sh and sync.sh in this repository. Sourced, not run.
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
# run creates a new import; the documents the imports write are the same, so the data converges. A sync
# runs only the rows whose query or CSV changed.
ldh_app_import_csv() {
    local app_dir="$1" manifest="$2"
    local query_filename csv_filename target_path title
    while IFS=, read -r query_filename csv_filename target_path title; do
        [ -n "$query_filename" ] || continue
        ldh_app_changed "$query_filename" "$csv_filename" || continue
        printf "Importing %s into %s\n" "$csv_filename" "${LDH_BASE}${target_path}"
        ldh import csv \
            --title "$title" \
            --query-file "$app_dir/$query_filename" \
            --csv-file "$app_dir/$csv_filename" \
            --wait \
            "${LDH_BASE}${target_path}" < /dev/null
    done < <(tail -n +2 "$manifest")
}

# --- sync -------------------------------------------------------------------------------------------
#
# A sync.sh redoes only what the changed files require, so it can run on every commit; install.sh
# stays the one-off (authorizations, packages). Two variables describe the commit, both optional:
#
#   LDH_CHANGED        newline-separated paths, relative to the app folder, added or modified by it.
#                      Unset means everything changed: `make sync` with neither set is a full sync.
#   LDH_PREVIOUS_TREE  the app folder as it was before the commit. When set, documents its files
#                      mapped to and the current files no longer do are deleted.

# True when any of the patterns (globs relative to the app folder, * crossing slashes) matches a
# changed path, and always when LDH_CHANGED is unset.
ldh_app_changed() {
    [ -n "${LDH_CHANGED+set}" ] || return 0
    local path pattern
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        for pattern in "$@"; do
            # shellcheck disable=SC2053 # the pattern is a glob on purpose
            [[ "$path" == $pattern ]] && return 0
        done
    done <<< "$LDH_CHANGED"
    return 1
}

# The plan `ldh push` makes for folder $1 onto $LDH_BASE, one "METHOD URI <- relative path" line per
# step. A dry run reads the files and sends nothing.
ldh_app_push_plan() {
    ldh push --dry-run --dir "$1" "$LDH_BASE" 2>&1 >/dev/null | grep -E '^(PUT|POST) ' || true
}

# Pushes app folder $1 when a changed file is part of its push plan: a document it PUTs or a file it
# uploads. Files the push ignores (.ldhignore) never trigger it. The push PUTs every document, not only
# the changed ones, so LDH_APP_PUSHED is set to 1 for whatever a sync must add back afterwards.
LDH_APP_PUSHED=0
ldh_app_push_changed() {
    local app_dir="$1" method uri arrow relative
    if [ -n "${LDH_CHANGED+set}" ]; then
        while read -r method uri arrow relative; do
            ldh_app_changed "$relative" && break
            relative=""
        done < <(ldh_app_push_plan "$app_dir")
        if [ -z "$relative" ]; then
            echo "No pushed document or file changed"
            return 0
        fi
    fi
    ldh push --dir "$app_dir" "$LDH_BASE" < /dev/null
    LDH_APP_PUSHED=1
}

# Deletes the documents app folder $1 no longer maps to: those in the push plan of LDH_PREVIOUS_TREE
# that are not in the current one, children before their parents. Uploads are kept, since other
# documents may still link them, and so are documents an import wrote, which no plan contains.
ldh_app_delete_removed() {
    local app_dir="$1" uri
    [ -n "${LDH_PREVIOUS_TREE:-}" ] && [ -d "$LDH_PREVIOUS_TREE" ] || return 0
    while IFS= read -r uri; do
        [ -n "$uri" ] || continue
        printf "Deleting %s\n" "$uri"
        ldh delete "$uri" < /dev/null
    done < <(comm -23 \
        <(ldh_app_push_plan "$LDH_PREVIOUS_TREE" | awk '$1 == "PUT" { print $2 }' | sort -u) \
        <(ldh_app_push_plan "$app_dir" | awk '$1 == "PUT" { print $2 }' | sort -u) \
        | sort -r)
}

# The sync of an app made of what the lib covers: the namespace ontology in admin/model/ns.ttl if the
# model changed, the document tree, the documents whose sources are gone, and the rows of imports.csv
# whose files changed. An app with other steps calls the parts itself.
ldh_app_sync() {
    local app_dir="$1"

    if [ -f "$app_dir/admin/model/ns.ttl" ] && ldh_app_changed 'admin/model/*'; then
        ldh_app_step "Importing namespace ontology"
        ldh_app_import_ns "$app_dir/admin/model"
    fi

    ldh_app_step "Pushing changed documents and files"
    ldh_app_push_changed "$app_dir"

    ldh_app_step "Deleting removed documents"
    ldh_app_delete_removed "$app_dir"

    if [ -f "$app_dir/imports.csv" ]; then
        ldh_app_step "Importing changed CSV data"
        ldh_app_import_csv "$app_dir" "$app_dir/imports.csv"
    fi
}
