# Systemd Target Server Notes

Goal: keep `kitz-dashboard` "plug-and-play" across OpenClaw instances by avoiding:

- hardcoded home directories (`/home/<user>/...`)
- secrets inside unit files

## Recommended Layout

- App code: `/opt/kitz-dashboard`
- Runtime data:
  - DB: `/var/lib/kitz-dashboard/kitz.db`
  - State: `/var/lib/kitz-dashboard/state/`
- Logs: `/var/log/kitz-dashboard/`
- Env file (secrets + config): `/etc/kitz-dashboard/kitz-dashboard.env`

## Unit File

Use `ops/systemd/kitz-dashboard.service` as the final default for a Linux target server.

Important: update these to match your deployment:

- `WorkingDirectory=...`
- `EnvironmentFile=...`
- `ReadWritePaths=...` (must cover `.next`, DB, state, and logs)
- `User=` / `Group=`

The service now assumes:

- app checkout at `/opt/kitz-dashboard`
- runtime user `kitz`
- production build already present in `.next`
- runtime writes only under `/opt/kitz-dashboard/.next`, `/var/lib/kitz-dashboard`, and `/var/log/kitz-dashboard`

## Env File

Minimal required values:

- `AUTH_USER`, `AUTH_PASS`
- `API_KEY`

Start from `ops/systemd/kitz-dashboard.env.example`.

Template-safe defaults:

- `KITZ_DB_PATH=/var/lib/kitz-dashboard/kitz.db`
- `KITZ_STATE_DIR=/var/lib/kitz-dashboard/state`

OpenClaw instance discovery:

- Single instance:
  - `KITZ_OPENCLAW_HOME=/home/<user>/.openclaw`
  - `KITZ_DEFAULT_INSTANCE=default`
- Multi instance:
  - `KITZ_OPENCLAW_INSTANCES=[{"id":"default","label":"Default","openclawHome":"..."}]`

## Secrets Hygiene

If you currently have a systemd drop-in (e.g. `override.conf`) that sets secrets via `Environment=...`,
move those values into the env file and remove them from the drop-in.


## Build Notes

Use `pnpm build` for deployments that run `next start` directly from the project root.

## Exact Target Server Setup

Create the service user and directories:

```bash
sudo useradd --system --create-home --home-dir /home/kitz --shell /usr/sbin/nologin kitz
sudo mkdir -p /opt/kitz-dashboard /etc/kitz-dashboard /var/lib/kitz-dashboard/state /var/log/kitz-dashboard
sudo chown -R kitz:kitz /opt/kitz-dashboard /var/lib/kitz-dashboard /var/log/kitz-dashboard
```

Clone and build the app:

```bash
sudo -u kitz git clone https://github.com/kitz-labs/AiKitzLabsDashboard.git /opt/kitz-dashboard
cd /opt/kitz-dashboard
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

Install env and service files:

```bash
sudo cp /opt/kitz-dashboard/ops/systemd/kitz-dashboard.env.example /etc/kitz-dashboard/kitz-dashboard.env
sudo cp /opt/kitz-dashboard/ops/systemd/kitz-dashboard.service /etc/systemd/system/kitz-dashboard.service
sudo chmod 640 /etc/kitz-dashboard/kitz-dashboard.env
sudo systemctl daemon-reload
sudo systemctl enable --now kitz-dashboard
```

Verify and inspect logs:

```bash
sudo systemctl status kitz-dashboard --no-pager
sudo journalctl -u kitz-dashboard -n 200 --no-pager
sudo journalctl -u kitz-dashboard -f
```

Deploy a new version later:

```bash
cd /opt/kitz-dashboard
sudo -u kitz git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart kitz-dashboard
```

## 1Password (Recommended)

If you deploy with 1Password, the production entrypoint supports resolving secrets at runtime via `op run`.

- Non-secret config: /etc/kitz-dashboard/kitz-dashboard.env
- op:// references (non-secret template): /etc/kitz-dashboard/kitz-dashboard.op.env
- Required secret for op: OP_SERVICE_ACCOUNT_TOKEN (set via systemd EnvironmentFile or another secret store)
- Optional mode flag:
  - `KITZ_1PASSWORD_MODE=off` (never use op)
  - `KITZ_1PASSWORD_MODE=auto` (default; try op then fallback to env)
  - `KITZ_1PASSWORD_MODE=required` (fail startup if op cannot run)

A template for the op env file lives at: ops/1password/kitz-dashboard.op.env.example

Notes:
- Analytics keys like PLAUSIBLE_SITE_ID / PLAUSIBLE_API_KEY should live in 1Password and be referenced from the op env template.
- `scripts/start-production.sh` uses `op run` according to `KITZ_1PASSWORD_MODE` and `KITZ_OP_ENV_FILE`.
