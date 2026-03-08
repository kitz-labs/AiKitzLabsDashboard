# Systemd Target Server Notes

Goal: keep `hermes-dashboard` "plug-and-play" across OpenClaw instances by avoiding:

- hardcoded home directories (`/home/<user>/...`)
- secrets inside unit files

## Recommended Layout

- App code: `/opt/hermes-dashboard`
- Runtime data:
  - DB: `/var/lib/hermes-dashboard/hermes.db`
  - State: `/var/lib/hermes-dashboard/state/`
- Logs: `/var/log/hermes-dashboard/`
- Env file (secrets + config): `/etc/hermes-dashboard/hermes-dashboard.env`

## Unit File

Use `ops/systemd/hermes-dashboard.service` as the final default for a Linux target server.

Important: update these to match your deployment:

- `WorkingDirectory=...`
- `EnvironmentFile=...`
- `ReadWritePaths=...` (must cover `.next`, DB, state, and logs)
- `User=` / `Group=`

The service now assumes:

- app checkout at `/opt/hermes-dashboard`
- runtime user `hermes`
- standalone build already present in `.next/standalone`
- runtime writes only under `/opt/hermes-dashboard/.next`, `/var/lib/hermes-dashboard`, and `/var/log/hermes-dashboard`

## Env File

Minimal required values:

- `AUTH_USER`, `AUTH_PASS`
- `API_KEY`

Start from `ops/systemd/hermes-dashboard.env.example`.

Template-safe defaults:

- `HERMES_DB_PATH=/var/lib/hermes-dashboard/hermes.db`
- `HERMES_STATE_DIR=/var/lib/hermes-dashboard/state`

OpenClaw instance discovery:

- Single instance:
  - `HERMES_OPENCLAW_HOME=/home/<user>/.openclaw`
  - `HERMES_DEFAULT_INSTANCE=default`
- Multi instance:
  - `HERMES_OPENCLAW_INSTANCES=[{"id":"default","label":"Default","openclawHome":"..."}]`

## Secrets Hygiene

If you currently have a systemd drop-in (e.g. `override.conf`) that sets secrets via `Environment=...`,
move those values into the env file and remove them from the drop-in.


## Build Notes

Use `pnpm build:standalone` for deployments that run `.next/standalone/server.js`, so `/_next/static/*` assets are copied into the standalone bundle.

## Exact Target Server Setup

Create the service user and directories:

```bash
sudo useradd --system --create-home --home-dir /home/hermes --shell /usr/sbin/nologin hermes
sudo mkdir -p /opt/hermes-dashboard /etc/hermes-dashboard /var/lib/hermes-dashboard/state /var/log/hermes-dashboard
sudo chown -R hermes:hermes /opt/hermes-dashboard /var/lib/hermes-dashboard /var/log/hermes-dashboard
```

Clone and build the app:

```bash
sudo -u hermes git clone https://github.com/kitz-labs/AiKitzLabsDashboard.git /opt/hermes-dashboard
cd /opt/hermes-dashboard
corepack enable
pnpm install --frozen-lockfile
pnpm build:standalone
```

Install env and service files:

```bash
sudo cp /opt/hermes-dashboard/ops/systemd/hermes-dashboard.env.example /etc/hermes-dashboard/hermes-dashboard.env
sudo cp /opt/hermes-dashboard/ops/systemd/hermes-dashboard.service /etc/systemd/system/hermes-dashboard.service
sudo chmod 640 /etc/hermes-dashboard/hermes-dashboard.env
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-dashboard
```

Verify and inspect logs:

```bash
sudo systemctl status hermes-dashboard --no-pager
sudo journalctl -u hermes-dashboard -n 200 --no-pager
sudo journalctl -u hermes-dashboard -f
```

Deploy a new version later:

```bash
cd /opt/hermes-dashboard
sudo -u hermes git pull --ff-only
pnpm install --frozen-lockfile
pnpm build:standalone
sudo systemctl restart hermes-dashboard
```

## 1Password (Recommended)

If you deploy with 1Password, the standalone entrypoint supports resolving secrets at runtime via op run.

- Non-secret config: /etc/hermes-dashboard/hermes-dashboard.env
- op:// references (non-secret template): /etc/hermes-dashboard/hermes-dashboard.op.env
- Required secret for op: OP_SERVICE_ACCOUNT_TOKEN (set via systemd EnvironmentFile or another secret store)
- Optional mode flag:
  - `HERMES_1PASSWORD_MODE=off` (never use op)
  - `HERMES_1PASSWORD_MODE=auto` (default; try op then fallback to env)
  - `HERMES_1PASSWORD_MODE=required` (fail startup if op cannot run)

A template for the op env file lives at: ops/1password/hermes-dashboard.op.env.example

Notes:
- Analytics keys like PLAUSIBLE_SITE_ID / PLAUSIBLE_API_KEY should live in 1Password and be referenced from the op env template.
- scripts/start-standalone.sh uses op run according to `HERMES_1PASSWORD_MODE` and `HERMES_OP_ENV_FILE`.
