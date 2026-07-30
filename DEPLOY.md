# Production Deployment Guide

## Architecture
- **Backend** (Django + Nginx + Postgres + Redis + Celery) → EC2 `13.201.63.198`
- **Frontend** (Next.js) → Vercel

---

## 1. EC2 Server Setup (first time only)

SSH into the server using the PEM key:
```bash
chmod 400 "dasvi-classess-new (1).pem"
ssh -i "dasvi-classess-new (1).pem" ubuntu@13.201.63.198
```

Install Docker & Docker Compose:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
newgrp docker
```

---

## 2. Upload / Clone the Project

From your **local machine**:
```bash
# Copy project to server (exclude node_modules, .next, __pycache__)
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '__pycache__' \
  --exclude '*.pyc' --exclude 'frontend/' \
  -e "ssh -i 'dasvi-classess-new (1).pem'" \
  /Users/avinashkumar/Office/monitor_Perf/ \
  ubuntu@13.201.63.198:~/monitor_Perf/
```

Or clone from git if you have a repo.

---

## 3. SSL Certificate (HTTPS)

### Let's Encrypt for `api-v1.cameeto.com`

> **Pre-requisite:** DNS A record for `api-v1.cameeto.com` must point to `13.201.63.198`

```bash
# Stop nginx temporarily so certbot can bind port 80
docker compose stop nginx   # (if already running)

sudo apt install -y certbot
sudo certbot certonly --standalone -d api-v1.cameeto.com

# Copy certs into nginx ssl directory
mkdir -p ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com
sudo cp /etc/letsencrypt/live/api-v1.cameeto.com/fullchain.pem \
         ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com/fullchain.pem
sudo cp /etc/letsencrypt/live/api-v1.cameeto.com/privkey.pem \
         ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com/privkey.pem
sudo chown ubuntu:ubuntu ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com/*
```

#### Auto-renew certs
```bash
# Add to crontab (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/api-v1.cameeto.com/fullchain.pem ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com/ && \
  cp /etc/letsencrypt/live/api-v1.cameeto.com/privkey.pem ~/monitor_Perf/nginx/ssl/api-v1.cameeto.com/ && \
  cd ~/monitor_Perf && docker compose restart nginx") | crontab -
```

---

## 4. Create Backend `.env`

On the EC2 server:
```bash
cat > ~/monitor_Perf/backend/.env << 'EOF'
SECRET_KEY=CHANGE-THIS-TO-A-LONG-RANDOM-STRING-50-CHARS-MIN
DEBUG=False
ALLOWED_HOSTS=13.201.63.198,localhost

# Database
DB_NAME=perf_monitor
DB_USER=postgres
DB_PASSWORD=CHANGE-THIS-DB-PASSWORD
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS — add your Vercel URL here
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://api-v1.cameeto.com

# Google PageSpeed API
GOOGLE_PAGESPEED_API_KEY=your-google-api-key-here

# Email (SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@perfmonitor.com

# Alert Thresholds
ALERT_PERFORMANCE_THRESHOLD=80
ALERT_LCP_THRESHOLD=2500
ALERT_CLS_THRESHOLD=0.1
ALERT_INP_THRESHOLD=200

# Scheduler
SCAN_INTERVAL_HOURS=6

# CSRF (required for Django Admin over HTTPS)
CSRF_TRUSTED_ORIGINS=https://api-v1.cameeto.com
EOF
```

> Generate a strong SECRET_KEY:
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(50))"
> ```

---

## 5. Start Backend Services

```bash
cd ~/monitor_Perf

# Build and start (backend + nginx + db + redis + celery)
docker compose up -d --build

# Check all containers are running
docker compose ps

# View logs
docker compose logs -f backend
```

Services started:
| Container | Role |
|---|---|
| `db` | PostgreSQL 16 |
| `redis` | Redis 7 |
| `backend` | Django + Gunicorn (port 8000 internal) |
| `celery_worker` | Async tasks |
| `celery_beat` | Scheduled tasks |
| `nginx` | Reverse proxy (ports 80 → 443) |

---

## 6. Create Django Superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## 7. Verify Backend is Live

```bash
curl https://api-v1.cameeto.com/api/v1/auth/login/
# Should return 405 Method Not Allowed (not 502/404)

# Django Admin
open https://api-v1.cameeto.com/admin/
```

---

## 8. AWS EC2 Security Group — Open Ports

In AWS Console → EC2 → Security Groups, add inbound rules:
| Port | Protocol | Source |
|---|---|---|
| 22 | TCP | Your IP (SSH) |
| 80 | TCP | 0.0.0.0/0 |
| 443 | TCP | 0.0.0.0/0 |

---

## 9. Frontend — Deploy to Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-v1.cameeto.com` |

Then deploy:
```bash
cd /Users/avinashkumar/Office/monitor_Perf/frontend
npx vercel --prod
```

Or connect the GitHub repo in Vercel dashboard and set the **Root Directory** to `frontend`.

---

## 10. Update CORS After Vercel Deployment

Once you have the Vercel URL (e.g. `https://monitor-perf.vercel.app`), update on EC2:

```bash
# Edit the .env file
nano ~/monitor_Perf/backend/.env
# Update both lines:
# CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://api-v1.cameeto.com
# CSRF_TRUSTED_ORIGINS=https://api-v1.cameeto.com,https://your-app.vercel.app

# Restart backend
docker compose restart backend
```

---

## Common Commands

```bash
# Restart all
docker compose restart

# Rebuild after code changes
docker compose up -d --build backend

# Run migrations manually
docker compose exec backend python manage.py migrate

# View nginx logs
docker compose logs nginx

# Stop everything
docker compose down
```
