#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f "ops/docker/kitz-dashboard.env" ]]; then
  echo "[deploy] Missing ops/docker/kitz-dashboard.env" >&2
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

echo "[deploy] Pulling latest code"
git pull --ff-only

echo "[deploy] Building and starting containers"
docker compose up -d --build

echo "[deploy] Current container status"
docker compose ps

echo "[deploy] Recent dashboard logs"
docker compose logs --tail=80 dashboard
