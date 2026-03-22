#!/usr/bin/env bash
# create-icons.sh — Convert icon.svg → icon.icns (macOS) using native tools.
# Usage: ./create-icons.sh [source.svg]
#   Defaults to icon.svg in the same directory as this script.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-$SCRIPT_DIR/icon.svg}"
OUT_DIR="$SCRIPT_DIR"
ICONSET="$OUT_DIR/icon.iconset"
PNG_1024="$OUT_DIR/icon_1024.png"

echo "==> Converting SVG to 1024x1024 PNG..."
# Use qlmanage (Quick Look) to render SVG → PNG at high resolution
qlmanage -t -s 1024 -o "$OUT_DIR" "$SRC" 2>/dev/null
# qlmanage appends .png to the original filename
QLOUT="$OUT_DIR/$(basename "$SRC").png"
if [ -f "$QLOUT" ]; then
  mv "$QLOUT" "$PNG_1024"
else
  echo "ERROR: qlmanage did not produce expected output. Trying sips fallback..."
  # Fallback: if source is already a PNG
  if [[ "$SRC" == *.png ]]; then
    cp "$SRC" "$PNG_1024"
    sips -z 1024 1024 "$PNG_1024" >/dev/null
  else
    echo "ERROR: Could not convert SVG to PNG. Install Inkscape or provide a 1024x1024 PNG."
    exit 1
  fi
fi

echo "==> Creating iconset with all required sizes..."
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# macOS .iconset requires these exact filenames and sizes
sizes=(16 32 64 128 256 512)
for size in "${sizes[@]}"; do
  retina=$((size * 2))
  sips -z "$size" "$size" "$PNG_1024" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1
  sips -z "$retina" "$retina" "$PNG_1024" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1
done
# 512@2x is the 1024 original
cp "$PNG_1024" "$ICONSET/icon_512x512@2x.png"

echo "==> Building icon.icns..."
iconutil -c icns "$ICONSET" -o "$OUT_DIR/icon.icns"

echo "==> Cleaning up..."
rm -rf "$ICONSET" "$PNG_1024"

echo "✓ Created $OUT_DIR/icon.icns"
