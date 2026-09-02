#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
EXIT_CODE=0

resolve_url() {
    python3 -c "
import urllib.parse, sys
base = 'http://x/' + sys.argv[1]
result = urllib.parse.urljoin(base, sys.argv[2])
print(result[len('http://x/'):])
" "$1" "$2"
}

while IFS= read -r -d '' ttl_file; do
    rel="${ttl_file#"$REPO_DIR"/}"

    # A .ttl is served at <its path minus .ttl>/ — except root.ttl, which install.sh PUTs
    # at the application base itself rather than at <dir>/root/. Resolving a root.ttl's
    # relative links against <dir>/root/ would send them one level too deep.
    if [[ "$(basename "$rel")" == "root.ttl" ]]; then
        url_path="$(dirname "$rel")/"
        [[ "$url_path" == "./" ]] && url_path=""
    else
        url_path="${rel%.ttl}/"
    fi

    while IFS= read -r url; do
        [[ "$url" =~ ^https?:// ]]  && continue
        [[ "$url" =~ ^# ]]          && continue
        [[ "$url" =~ (^|/)uploads/ ]] && continue
        [[ -z "$url" ]]             && continue

        path="${url%%#*}"
        [[ -z "$path" ]] && continue
        [[ "$path" =~ \.[a-zA-Z]+$ ]] && continue   # skip links to files (e.g. .xsl)

        resolved="$(resolve_url "$url_path" "$path")"
        target_file="$REPO_DIR/${resolved%/}.ttl"

        if [[ ! -f "$target_file" ]]; then
            echo "BROKEN: $rel  →  $url  (resolves to ${resolved%/}.ttl)"
            EXIT_CODE=1
        fi
    done < <(grep -oE '(href|src|data)="[^"]*"' "$ttl_file" | sed 's/^[^"]*"//;s/"$//' || true)
done < <(find "$REPO_DIR" -name "*.ttl" -print0)

exit "$EXIT_CODE"
