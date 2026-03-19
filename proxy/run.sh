#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="clovax-proxy"
IMAGE_NAME="clovax-proxy"

# 기존 컨테이너 제거
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing container: ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "Building image..."
docker build -t "${IMAGE_NAME}" "${SCRIPT_DIR}"

echo "Starting ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 80:8080 \
  "${IMAGE_NAME}"

echo "Running at http://localhost"
