#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="clovax-proxy"

# 기존 컨테이너가 있으면 제거
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing container: ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "Starting ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 80:80 \
  -v "${SCRIPT_DIR}/clovax-proxy.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine

echo "Running at http://localhost"
