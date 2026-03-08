#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="ops/docker/kitz-dashboard.env"

compose() {
  docker compose --env-file "$ENV_FILE" "$@"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] Missing $ENV_FILE" >&2
  echo "[deploy] Copy ops/docker/kitz-dashboard.env.example and fill in your secrets first." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] docker is not installed." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] docker compose plugin is not available." >&2
  exit 1
fi

echo "[deploy] Using live env file: $ENV_FILE"

echo "[deploy] Pulling latest code"
git pull --ff-only

echo "[deploy] Pulling latest dashboard image"
compose pull dashboard

echo "[deploy] Starting containers"
compose up -d --force-recreate --remove-orphans

echo "[deploy] Current container status"
compose ps

echo "[deploy] Recent dashboard logs"
compose logs --tail=80 dashboard
