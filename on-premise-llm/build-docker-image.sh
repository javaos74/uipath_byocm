#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="javaos74/uipath-byocm"

# package.json에서 버전 추출
VERSION=$(node -p "require('${SCRIPT_DIR}/package.json').version")

echo "Building ${IMAGE_NAME}:${VERSION}..."
docker build -t "${IMAGE_NAME}:${VERSION}" -t "${IMAGE_NAME}:latest" "${SCRIPT_DIR}"

echo "Pushing ${IMAGE_NAME}:${VERSION}..."
docker push "${IMAGE_NAME}:${VERSION}"
docker push "${IMAGE_NAME}:latest"

echo "Pushed: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
