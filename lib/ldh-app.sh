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
# run creates a new import; the documents the imports write are the same, so the data converges. A sync
# runs only the rows whose query or CSV changed.
ldh_app_import_csv() {
    local app_dir="$1" manifest="$2"
    local query_filename csv_filename target_path title
    while IFS=, read -r query_filename csv_filename target_path title; do
        [ -n "$query_filename" ] || continue
        ldh_app_changed "$query_filename" "$csv_filename" || continue
        printf "Importing %s into %s\n" "$csv_filename" "${LDH_BASE}${target_path}"
        ldh_app_track_import "${LDH_BASE}${target_path}" ldh import csv \
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
# stays the one-off. Two variables describe the commit, both optional:
#
#   LDH_CHANGED        newline-separated paths, relative to the app folder, added or modified by it.
#                      Unset means everything changed: a manual `make sync` is a full sync.
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
# uploads. Files the push ignores (.ldhignore) never trigger it.
ldh_app_push_changed() {
    local app_dir="$1" method uri arrow relative
    if [ -z "${LDH_CHANGED+set}" ]; then
        ldh push --dir "$app_dir" "$LDH_BASE"
        return
    fi
    while read -r method uri arrow relative; do
        if ldh_app_changed "$relative"; then
            ldh push --dir "$app_dir" "$LDH_BASE" < /dev/null
            return
        fi
    done < <(ldh_app_push_plan "$app_dir")
    echo "No pushed document or file changed"
}

# Deletes the documents app folder $1 no longer maps to: those in the push plan of LDH_PREVIOUS_TREE
# that are not in the current one, children before their parents. Uploads are kept, since other
# documents may still link them, and so are documents an import wrote, which no plan contains.
ldh_app_delete_removed() {
    local app_dir="$1" uri
    [ -n "${LDH_PREVIOUS_TREE:-}" ] || return 0
    [ -d "$LDH_PREVIOUS_TREE" ] || return 0
    while IFS= read -r uri; do
        [ -n "$uri" ] || continue
        printf "Deleting %s\n" "$uri"
        ldh delete "$uri" < /dev/null
    done < <(comm -23 \
        <(ldh_app_push_plan "$LDH_PREVIOUS_TREE" | awk '$1 == "PUT" { print $2 }' | sort -u) \
        <(ldh_app_push_plan "$app_dir" | awk '$1 == "PUT" { print $2 }' | sort -u) \
        | sort -r)
}

# The ldh:CSVImport and ldh:RDFImport resources in document $1.
ldh_app_import_uris() {
    ldh get --accept application/n-triples "$1" |
        grep -E ' <http://www\.w3\.org/1999/02/22-rdf-syntax-ns#type> <https://w3id\.org/atomgraph/linkeddatahub#(CSV|RDF)Import> ' |
        awk '{ print $1 }' | tr -d '<>' | sort -u || true
}

# Runs the import command "${@:2}" into document $1 and records the import it creates in
# LDH_APP_IMPORTS, for ldh_app_await_imports.
LDH_APP_IMPORTS=()
ldh_app_track_import() {
    local doc="$1" before uri
    shift
    before=$(ldh_app_import_uris "$doc")
    "$@"
    while IFS= read -r uri; do
        [ -n "$uri" ] && LDH_APP_IMPORTS+=("$uri")
    done < <(comm -13 <(echo "$before") <(ldh_app_import_uris "$doc"))
}

# Waits until every import in LDH_APP_IMPORTS carries prov:endedAtTime, which the platform adds to the
# import's own document when it finishes. Fails when one of them reports an error (a prov:Entity with
# a dct:description) or when LDH_IMPORT_TIMEOUT seconds (default 1200) pass first.
ldh_app_await_imports() {
    [ "${#LDH_APP_IMPORTS[@]}" -gt 0 ] || return 0
    local deadline=$(( $(date +%s) + ${LDH_IMPORT_TIMEOUT:-1200} ))
    local uri doc triples errors failed=0
    for uri in "${LDH_APP_IMPORTS[@]}"; do
        doc="${uri%%#*}"
        printf "Waiting for %s\n" "$uri"
        while :; do
            triples=$(ldh get --accept application/n-triples "$doc")
            grep -qF "<$uri> <http://www.w3.org/ns/prov#endedAtTime> " <<< "$triples" && break
            if [ "$(date +%s)" -ge "$deadline" ]; then
                echo "Timed out waiting for $uri" >&2
                return 1
            fi
            sleep 10
        done
        # the error entities point at the import with prov:wasGeneratedBy
        errors=$(grep -F " <http://www.w3.org/ns/prov#wasGeneratedBy> <$uri> " <<< "$triples" | awk '{ print $1 }' |
            while IFS= read -r entity; do
                grep -F "$entity <http://purl.org/dc/terms/description> " <<< "$triples" || true
            done)
        if [ -n "$errors" ]; then
            echo "Import failed: $uri" >&2
            echo "$errors" >&2
            failed=1
        fi
    done
    return "$failed"
}
