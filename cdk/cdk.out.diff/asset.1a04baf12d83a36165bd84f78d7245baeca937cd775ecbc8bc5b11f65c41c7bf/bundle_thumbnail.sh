#!/usr/bin/env bash
# Bundle the thumbnail Lambda with Pillow for Amazon Linux 2023 (Python 3.12)
# Run from the cdk/ directory: bash lambda_functions/bundle_thumbnail.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/thumbnail"
BUNDLE_DIR="${SCRIPT_DIR}/thumbnail_bundle"

echo "==> Cleaning previous bundle..."
rm -rf "${BUNDLE_DIR}"
mkdir -p "${BUNDLE_DIR}"

echo "==> Installing Pillow for Lambda (manylinux, x86_64, Python 3.12)..."
pip3 install \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.12 \
    --only-binary=:all: \
    --target "${BUNDLE_DIR}" \
    -r "${SOURCE_DIR}/requirements.txt" \
    --quiet

echo "==> Copying Lambda source files..."
cp "${SOURCE_DIR}/generate_thumbnails.py" "${BUNDLE_DIR}/"
cp "${SOURCE_DIR}/backfill_thumbnails.py" "${BUNDLE_DIR}/"

echo "==> Bundle complete: ${BUNDLE_DIR}"
echo "    Files: $(ls "${BUNDLE_DIR}" | wc -l | tr -d ' ') items"
echo "    Size:  $(du -sh "${BUNDLE_DIR}" | cut -f1)"
