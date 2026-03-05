#!/bin/bash

TARGET_DIR="${1:-.}"

# Ensure absolute path
ABS_TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo '<?xml version="1.0" encoding="UTF-8"?>'
echo '<map xmlns="http://www.w3.org/2005/xpath-functions">'
echo '  <array key="files">'

find "$ABS_TARGET_DIR" -type f | while read -r file; do
  sha=$(shasum -a 1 "$file" | awk '{print $1}')
  relpath="${file#$ABS_TARGET_DIR/}"
  safe_name=$(printf "%s" "$relpath" | xmlstarlet esc)

  echo '    <map>'
  echo "      <string key=\"name\">$safe_name</string>"
  echo "      <string key=\"sha1\">$sha</string>"
  echo '    </map>'
done

echo '  </array>'
echo '</map>'
