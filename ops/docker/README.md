# Docker Compose Deploy

This setup runs the dashboard as a single Docker Compose service on port `3000`.

Best fit: a small Linux VPS such as Hostinger, with Nginx in front of Docker.

## Files

- `Dockerfile` is used by GitHub Actions to build the production image.
- `docker-compose.yml` pulls `ghcr.io/kitz-labs/aikitz-dashboard:latest` and starts it with a persistent named volume.
- `ops/docker/kitz-dashboard.env.example` contains the runtime secrets/config template.
- `ops/docker/kitz-dashboard.env` is the live runtime env file used by Compose and should exist only on the deploy machine.

## First-time setup

Copy the example env file and edit the secrets:

```bash
cp ops/docker/kitz-dashboard.env.example ops/docker/kitz-dashboard.env
```

The real `ops/docker/kitz-dashboard.env` file is ignored by Git and should not be pushed.

Required values:

- `AUTH_USER`
- `AUTH_PASS`
- `API_KEY`

## Start

```bash
docker compose pull
docker compose up -d --force-recreate --remove-orphans
```

Or use the included helper:

```bash
bash ops/docker/deploy.sh
```

If GHCR ever asks for authentication on the server, log in once first:

```bash
docker login ghcr.io
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
docker compose pull
docker compose up -d --force-recreate --remove-orphans
docker compose logs -f dashboard
```

Or simply:

```bash
bash ops/docker/deploy.sh
```

This VPS setup uses a prebuilt GHCR image that runs the plain Next.js production server with `next start`.

## Troubleshooting

- `docker compose logs -f dashboard` to inspect startup errors
- `docker compose ps` to verify the container is up
- `docker compose pull` to confirm the VPS can access `ghcr.io/kitz-labs/aikitz-dashboard:latest`
- `docker inspect --format='{{json .State.Health}}' kitz-dashboard` to confirm the container becomes `healthy`
- `curl http://127.0.0.1:3000` on the VPS to verify the app before checking Nginx
- If Nginx returns `502`, verify the container actually pulled and is listening on `3000`
- If GitHub auto-deploy fails, inspect `.github/workflows/deploy-vps.yml` and the Actions logs
