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
    url_path="${rel%.ttl}/"

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
