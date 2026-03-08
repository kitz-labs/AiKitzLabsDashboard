#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PORT="${PORT:-3000}"

OP_MODE="${KITZ_1PASSWORD_MODE:-auto}"
OP_ENV_FILE="${KITZ_OP_ENV_FILE:-/etc/kitz-dashboard/kitz-dashboard.op.env}"

run_with_op() {
  echo "[start] resolving runtime env via 1Password: $OP_ENV_FILE" >&2
  op run --env-file="$OP_ENV_FILE" -- pnpm start
}

can_use_op() {
  command -v op >/dev/null 2>&1 \
    && [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]] \
    && [[ -f "$OP_ENV_FILE" ]]
}

case "${OP_MODE,,}" in
  off|false|0|disabled)
    echo "[start] 1Password overlay disabled (KITZ_1PASSWORD_MODE=$OP_MODE)" >&2
    ;;
  required)
    if can_use_op; then
      run_with_op
      exit $?
    fi
    echo "[start] 1Password required but unavailable. Ensure: op installed, OP_SERVICE_ACCOUNT_TOKEN set, and KITZ_OP_ENV_FILE exists." >&2
    exit 1
    ;;
  auto|"")
    if can_use_op; then
      if run_with_op; then
        exit 0
      fi
      echo "[start] op run failed; falling back to existing env" >&2
    else
      echo "[start] 1Password unavailable; using existing env" >&2
    fi
    ;;
  *)
    echo "[start] Invalid KITZ_1PASSWORD_MODE='$OP_MODE'. Use: off|auto|required" >&2
    exit 1
    ;;
esac

exec pnpm start