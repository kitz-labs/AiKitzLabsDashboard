# Hostinger VPS Setup

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
```

## 2. Clone the repo

```bash
git clone https://github.com/kitz-labs/AiKitzLabsDashboard.git
cd AiKitzLabsDashboard
```

## 3. Prepare runtime env

```bash
cp ops/docker/kitz-dashboard.env.example ops/docker/kitz-dashboard.env
nano ops/docker/kitz-dashboard.env
```

Fill in at least:

- `AUTH_USER`
- `AUTH_PASS`
- `API_KEY`

## 4. Start the app

```bash
docker compose up -d --build
```

## 5. Check status

```bash
docker compose ps
docker compose logs -f dashboard
```

## 6. Configure Nginx

Copy `ops/docker/nginx.hostinger.conf.example` to your Nginx sites config and replace `dashboard.example.com` with your domain.

## 7. Enable HTTPS

Example with Certbot:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.example.com
```

## 8. Update later

```bash
bash ops/docker/deploy.sh
```

## 9. Optional: GitHub Actions auto-deploy

The repo includes an auto-deploy workflow at:

- `.github/workflows/deploy-vps.yml`

Add these GitHub repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`

Full setup notes live in:

- `ops/docker/github-actions-auto-deploy.md`
