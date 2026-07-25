# FUGUSAU Portal — Kali Linux Deployment Guide

## Prerequisites

Run these on your Kali machine first:

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 1 — Push to GitHub

On your local machine (wherever you have the project):

```bash
cd fugusau-portal

git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/fugusau-portal.git
git branch -M main
git push -u origin main
```

> `.env.production` is blocked by `.gitignore` — it will NOT be pushed. Good.

---

## Step 2 — Pull onto your Kali machine

```bash
git clone https://github.com/YOUR_USERNAME/fugusau-portal.git
cd fugusau-portal
```

---

## Step 3 — Create your production environment file

```bash
cp backend/.env.example backend/.env.production
nano backend/.env.production
```

**Required changes — fill these in:**

| Variable | What to set |
|----------|-------------|
| `SECRET_KEY` | Run: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DB_PASSWORD` | Any strong password e.g. `Fugu$au2025!` |
| `DB_REPLICA_PASSWORD` | Same as DB_PASSWORD |
| `ALLOWED_HOSTS` | Your Kali machine IP e.g. `localhost,127.0.0.1,192.168.1.50` |
| `FRONTEND_URL` | `http://YOUR_KALI_IP` |
| `CORS_ALLOWED_ORIGINS` | `http://YOUR_KALI_IP,http://localhost` |

Everything else (Paystack, SendGrid, etc.) can be left blank for now — the app will run without them.

Find your Kali IP with: `ip addr show | grep "inet " | grep -v 127`

---

## Step 4 — Update docker-compose.prod.yml frontend build args

Open `docker-compose.prod.yml` and find the `frontend:` service. Add your IP:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://YOUR_KALI_IP/api/v1
        VITE_WS_URL: ws://YOUR_KALI_IP/ws
```

Replace `YOUR_KALI_IP` with the actual IP from Step 3.

---

## Step 5 — Update nginx.conf for local deployment (no domain/SSL)

Since you're running locally without a domain, replace `nginx/nginx.conf` with the simple version:

```bash
cat > nginx/nginx.conf << 'NGINX'
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;
    client_max_body_size 50M;

    upstream backend  { server backend:8000; }
    upstream frontend { server frontend:3000; }

    server {
        listen 80;

        location /static/ {
            alias /var/www/static/;
            expires 30d;
        }
        location /media/ {
            alias /var/www/media/;
        }
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400s;
        }
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
NGINX
```

---

## Step 6 — Build and start

```bash
# Build all images (takes a few minutes the first time)
docker compose -f docker-compose.prod.yml build

# Start everything in the background
docker compose -f docker-compose.prod.yml up -d

# Watch the logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Step 7 — Create a Django superuser

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## Step 8 — Verify everything is running

```bash
docker compose -f docker-compose.prod.yml ps
```

You should see all these as `running`:
- `fugusau_db_prod`
- `fugusau_redis_master`
- `fugusau_redis_replica`
- `fugusau_redis_sentinel`
- `fugusau_daphne_prod`
- `fugusau_celery_prod`
- `fugusau_celerybeat_prod`
- `fugusau_frontend_prod`
- `fugusau_nginx_prod`
- 3× `backend` replicas

Then open your browser to: **http://YOUR_KALI_IP**

---

## Useful commands

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop and wipe the database (careful!)
docker compose -f docker-compose.prod.yml down -v

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend

# Run migrations manually
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# View backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# View celery logs
docker compose -f docker-compose.prod.yml logs -f celery
```

---

## If something fails

**Port 80 already in use:**
```bash
sudo lsof -i :80
sudo systemctl stop apache2  # or nginx if installed on host
```

**Database connection refused:**
```bash
docker compose -f docker-compose.prod.yml logs db
# Wait for "database system is ready to accept connections"
```

**Backend keeps restarting:**
```bash
docker compose -f docker-compose.prod.yml logs backend
# Usually a missing .env.production value or SECRET_KEY
```
