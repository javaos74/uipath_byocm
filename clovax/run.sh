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

# TLS 인증서 마운트 옵션 구성 (선택적)
DOCKER_OPTS=()

if [[ -n "${TLS_CERT:-}" && -n "${TLS_KEY:-}" ]]; then
  echo "TLS 인증서 감지: HTTPS 모드로 실행합니다."
  DOCKER_OPTS+=(
    -v "${TLS_CERT}:/certs/server.crt:ro"
    -v "${TLS_KEY}:/certs/server.key:ro"
    -e "TLS_CERT=/certs/server.crt"
    -e "TLS_KEY=/certs/server.key"
  )
  PROTOCOL="https"
else
  echo "TLS 인증서 미설정: HTTP 모드로 실행합니다."
  PROTOCOL="http"
fi

echo "Starting ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 8080:8080 \
  "${DOCKER_OPTS[@]+"${DOCKER_OPTS[@]}"}" \
  "${IMAGE_NAME}"

echo "Running at ${PROTOCOL}://localhost:8080"
