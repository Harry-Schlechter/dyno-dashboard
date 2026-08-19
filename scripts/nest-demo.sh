#!/usr/bin/env bash
# nest-demo.sh — move the demo build under build/sample/.
#
# CRA builds with PUBLIC_URL=/sample so every asset URL is absolute
# (/sample/static/js/main.js), but it still writes the files to build/ root.
# Netlify serves the publish directory AS the site root, so without this step
# the HTML asks for /sample/static/... while the file actually sits at
# /static/... — every asset 404s and the page renders blank.
#
# Nesting the output under build/sample/ makes the on-disk layout match the
# URLs the HTML references.

set -euo pipefail

BUILD_DIR="build"
NEST_DIR="${BUILD_DIR}/sample"

if [ ! -f "${BUILD_DIR}/index.html" ]; then
  echo "nest-demo: ${BUILD_DIR}/index.html not found — did the build run?" >&2
  exit 1
fi

# Already nested (idempotent re-run) — nothing to do.
if [ -d "${NEST_DIR}" ] && [ ! -f "${BUILD_DIR}/index.html" ]; then
  echo "nest-demo: already nested."
  exit 0
fi

TMP="$(mktemp -d)"
# Move everything currently in build/ into the temp dir...
find "${BUILD_DIR}" -mindepth 1 -maxdepth 1 -exec mv {} "${TMP}/" \;
# ...then put it back one level down, under build/sample/.
mkdir -p "${NEST_DIR}"
find "${TMP}" -mindepth 1 -maxdepth 1 -exec mv {} "${NEST_DIR}/" \;
rmdir "${TMP}"

echo "nest-demo: build output nested at ${NEST_DIR}/"
