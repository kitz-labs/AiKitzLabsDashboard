# Docker Compose Deploy

This setup runs the dashboard as a single Docker Compose service on port `3000`.

## Files

- `Dockerfile` builds the standalone Next.js runtime.
- `docker-compose.yml` starts the app with a persistent named volume.
- `ops/docker/hermes-dashboard.env.example` contains the runtime secrets/config template.

## First-time setup

Copy the example env file and edit the secrets:

```bash
cp ops/docker/hermes-dashboard.env.example ops/docker/hermes-dashboard.env
```

Required values:

- `AUTH_USER`
- `AUTH_PASS`
- `API_KEY`

## Start

```bash
docker compose up -d --build
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

The named volume `hermes-data` stores:

- `/data/hermes.db`
- `/data/state`

## Reverse proxy

If Hostinger proxies traffic through Nginx or another frontend, forward requests to:

- `http://127.0.0.1:3000`

If you terminate TLS upstream, keep `AUTH_COOKIE_SECURE=true`.
