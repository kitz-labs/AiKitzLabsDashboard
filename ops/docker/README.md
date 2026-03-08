# Docker Compose Deploy

This setup runs the dashboard as a single Docker Compose service on port `3000`.

Best fit: a small Linux VPS such as Hostinger, with Nginx in front of Docker.

## Files

- `Dockerfile` builds the app with `next build` and starts it with `next start`.
- `docker-compose.yml` starts the app with a persistent named volume.
- `ops/docker/kitz-dashboard.env.example` contains the runtime secrets/config template.

## First-time setup

Copy the example env file and edit the secrets:

```bash
cp ops/docker/kitz-dashboard.env.example ops/docker/kitz-dashboard.env
```

Required values:

- `AUTH_USER`
- `AUTH_PASS`
- `API_KEY`

## Start

```bash
docker compose up -d --build
```

Or use the included helper:

```bash
bash ops/docker/deploy.sh
```

## Logs

```bash
docker compose logs -f dashboard
```

## Stop

```bash
docker compose down
```

## Persisted data

The named volume `kitz-data` stores:

- `/data/kitz.db`
- `/data/state`

## Reverse proxy

If Hostinger proxies traffic through Nginx or another frontend, forward requests to:

- `http://127.0.0.1:3000`

If you terminate TLS upstream, keep `AUTH_COOKIE_SECURE=true`.

An example Nginx server block is included in:

- `ops/docker/nginx.hostinger.conf.example`

## Hostinger VPS

Complete VPS setup steps live in:

- `ops/docker/hostinger-vps-setup.md`
- `ops/docker/github-actions-auto-deploy.md`

## Update flow

For later updates on the server:

```bash
git pull --ff-only
docker compose up -d --build
docker compose logs -f dashboard
```

Or simply:

```bash
bash ops/docker/deploy.sh
```

This VPS setup uses the plain Next.js production server with `next build` and `next start`.

## Troubleshooting

- `docker compose logs -f dashboard` to inspect startup errors
- `docker compose ps` to verify the container is up
- `curl http://127.0.0.1:3000` on the VPS to verify the app before checking Nginx
- If Nginx returns `502`, verify the container actually built and is listening on `3000`
- If GitHub auto-deploy fails, inspect `.github/workflows/deploy-vps.yml` and the Actions logs
