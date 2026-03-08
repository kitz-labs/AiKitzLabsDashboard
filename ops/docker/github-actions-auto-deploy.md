# GitHub Actions Auto-Deploy

This workflow deploys automatically to your VPS after the `Publish Image` workflow pushes a fresh image on `main`.

## Workflow file

- `.github/workflows/deploy-vps.yml`

## Required GitHub Secrets

Create these repository secrets in GitHub under **Settings → Secrets and variables → Actions**:

- `VPS_HOST` — your VPS IP or hostname
- `VPS_USER` — SSH user on the VPS
- `VPS_PORT` — SSH port, usually `22`
- `VPS_SSH_KEY` — private SSH key used by GitHub Actions
- `VPS_APP_DIR` — absolute path to the cloned repo on the VPS

Example values:

- `VPS_HOST=203.0.113.10`
- `VPS_USER=root`
- `VPS_PORT=22`
- `VPS_APP_DIR=/opt/AiKitzLabsDashboard`

## Server prerequisites

The VPS must already have:

- Docker installed
- The repo cloned locally
- `ops/docker/kitz-dashboard.env` filled out
- Access to pull `ghcr.io/kitz-labs/aikitz-dashboard:latest` (public package, or `docker login ghcr.io` if you keep it private)
- Nginx or another proxy forwarding traffic to `127.0.0.1:3000`

## SSH key setup

Generate a deploy key locally if you do not already have one:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions-deploy
```

Add the public key to the VPS user:

```bash
ssh-copy-id -i ~/.ssh/github-actions-deploy.pub user@your-vps-host
```

Then copy the contents of `~/.ssh/github-actions-deploy` into the GitHub secret `VPS_SSH_KEY`.

## How deploy works

After a successful push to `main`, the workflow:

1. Opens an SSH connection to the VPS
2. Changes into `VPS_APP_DIR`
3. Fetches and hard-resets to `origin/main`
4. Pulls the latest GHCR-backed image via `bash ops/docker/deploy.sh`
5. Checks that `http://127.0.0.1:3000` responds

## Manual deploy

You can also trigger the workflow manually from the **Actions** tab using `workflow_dispatch`.

## Troubleshooting

- Check the `Deploy VPS` workflow logs in GitHub Actions
- Verify the SSH key can log in non-interactively
- Verify `VPS_APP_DIR` points to the repo root on the server
- If the GHCR package is private, run `docker login ghcr.io` on the VPS first
- Run `bash ops/docker/deploy.sh` manually once on the VPS before enabling auto-deploy
