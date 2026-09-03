#!/usr/bin/env bash
set -euo pipefail

# Checks that every rdf:XMLLiteral lexical form in the RDF corpus is in exclusive
# canonical XML form, which RDF 1.1 requires of the datatype's lexical space.
#
# Jena 4.7.0 enforced this while validating; Jena 5 and later only check
# well-formedness. Without this check a non-canonical literal passes both
# `make validate` and the CI syntax check while still being invalid.
#
# The rules that follow from canonical form, when authoring XHTML literals:
# attributes in alphabetical order, explicit end tags (<br></br>, never <br/>),
# and each start tag on a single line.
#
# Usage: check-xmlliterals.sh [directory]   (defaults to the script's own directory)

ROOT_DIR="$(cd "${1:-$(dirname "$0")}" && pwd)"
EXIT_CODE=0

if ! command -v xmllint > /dev/null; then
    echo "check-xmlliterals.sh: xmllint is required (Debian/Ubuntu: libxml2-utils)" >&2
    exit 2
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

cd "$ROOT_DIR"

while IFS= read -r -d '' file; do
    rm -f "$WORK_DIR"/lit.*

    # Write the lexical form of each """..."""^^rdf:XMLLiteral literal to its own
    # file under $WORK_DIR, and report the literal's number and starting line.
    awk -v out="$WORK_DIR" '
        function emit(body, start,    path) {
            path = out "/lit." ++n
            printf "%s", body > path
            close(path)
            print n, start
        }
        {
            pos = 1
            while ((idx = index(substr($0, pos), "\"\"\"")) > 0) {
                at = pos + idx - 1
                if (inside) {
                    body = body substr($0, pos, at - pos)
                    inside = 0
                    if (substr($0, at + 3) ~ /^[ \t]*\^\^[ \t]*rdf:XMLLiteral/) emit(body, start)
                } else {
                    inside = 1
                    start = NR
                    body = ""
                }
                pos = at + 3
            }
            if (inside) body = body substr($0, pos) "\n"
        }
    ' "$file" > "$WORK_DIR/manifest"

    while read -r literal start; do
        lexical_form="$WORK_DIR/lit.$literal"

        if ! xmllint --exc-c14n "$lexical_form" > "$WORK_DIR/canonical" 2> "$WORK_DIR/parse-error"; then
            echo "$file:$start: rdf:XMLLiteral is not well-formed XML" >&2
            sed 's|^|    |' "$WORK_DIR/parse-error" >&2
            EXIT_CODE=1
            continue
        fi

        if ! cmp -s "$lexical_form" "$WORK_DIR/canonical"; then
            echo "$file:$start: rdf:XMLLiteral is not canonical XML" >&2
            # diff exits non-zero when the files differ, which set -e would treat as fatal
            diff -u "$lexical_form" "$WORK_DIR/canonical" | sed -e '1,2d' -e 's|^|    |' >&2 || true
            EXIT_CODE=1
        fi
    done < "$WORK_DIR/manifest"
done < <(find . \( -name '*.ttl' -o -name '*.trig' \) -type f -not -path '*/.git/*' -not -path '*/html/*' -print0)

exit "$EXIT_CODE"
