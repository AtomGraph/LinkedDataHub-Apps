#!/bin/sh
set -e
# absolute path to output and temp RDF folders
OUTPUT_FOLDER="$PWD"/html
RDF_FOLDER="$PWD"/rdf

# Convert each .ttl to RDF/XML into a dedicated rdf/ folder, mirroring the directory structure
find . -name "*.ttl" -exec sh -c '
    rel=$(echo "$1" | sed "s|^\./||")
    base="file:///${rel%.ttl}/"
    out="'"$RDF_FOLDER"'/${rel%.ttl}.rdf"
    mkdir -p "$(dirname "$out")"
    riot --output=RDF/XML --base="$base" "$1" > "$out"
' sh {} \;

# Generate timestamps.xml (doc path → source .ttl modification time)
echo '<?xml version="1.0" encoding="UTF-8"?>' > timestamps.xml
echo '<map xmlns="http://www.w3.org/2005/xpath-functions">' >> timestamps.xml
find . -name "*.ttl" -exec sh -c '
    rel=$(echo "$1" | sed "s|^\./||")
    path="/${rel%.ttl}/"
    mtime=$(date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ)
    echo "  <string key=\"$path\">$mtime</string>"
' sh {} \; >> timestamps.xml
echo '</map>' >> timestamps.xml

# Clear output folder first, so files.xml does not pick up stale html/files/ contents
rm -rf "$OUTPUT_FOLDER"
mkdir -p "$OUTPUT_FOLDER"

# Generate files.xml (sha1 hash → relative filename mapping, scans current folder recursively)
./sha1map-to-xml.sh . > files.xml

# Convert the RDF/XML files to XHTML pages
docker run --rm -v "$PWD":"/docs" -v "$RDF_FOLDER":"/rdf" -v "$OUTPUT_FOLDER":"/output" atomgraph/saxon \
    -it:main \
    -xsl:/docs/ttl-to-html.xsl \
    rdf-dir="/rdf" \
    output-folder="/output"

# Copy media files (excluding html output, generated .rdf/.xml, scripts) to html/files/
rsync -a --exclude=html --exclude=rdf --exclude=node_modules --exclude='*.rdf' --exclude='*.xml' --exclude='*.ttl' --exclude='*.sh' --exclude=Makefile . "$OUTPUT_FOLDER/files/"

# Remove temporary RDF/XML folder
rm -rf "$RDF_FOLDER"
