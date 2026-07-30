#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh  —  Deploy backend to 13.201.63.198 (api-v1.cameeto.com)
# Usage:  bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

SERVER_IP="13.201.63.198"
SERVER_USER="ubuntu"
PEM_KEY="$HOME/Downloads/dasvi-classess-new (1).pem"
REMOTE_DIR="~/monitor_Perf"
DOMAIN="api-v1.cameeto.com"

echo "──────────────────────────────────────────"
echo "  PerfMonitor Backend Deployment"
echo "  Server : $SERVER_USER@$SERVER_IP"
echo "  Domain : https://$DOMAIN"
echo "──────────────────────────────────────────"

# ── 1. Fix PEM permissions ────────────────────────────────────────────────────
chmod 400 "$PEM_KEY"

SSH="ssh -i \"$PEM_KEY\" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP"

# ── 2. Upload project (exclude frontend, node_modules, __pycache__, .next) ───
echo ""
echo "▶ Uploading project files..."
rsync -avz --progress \
  --exclude 'frontend/' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'backend/staticfiles/' \
  --exclude 'backend/media/' \
  --exclude 'backend/db.sqlite3' \
  -e "ssh -i \"$PEM_KEY\" -o StrictHostKeyChecking=no" \
  "$(dirname "$0")/" \
  "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"

echo "✓ Files uploaded"

# ── 3. Remote setup ───────────────────────────────────────────────────────────
echo ""
echo "▶ Running remote setup..."

ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" bash << REMOTE
set -e

echo "── Installing Docker (if not present) ──"
if ! command -v docker &> /dev/null; then
  echo "  Installing Docker via official repo..."
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker \$USER
  echo "✓ Docker installed"
else
  echo "✓ Docker already installed: \$(docker --version)"
  # Ensure compose plugin is present even if docker was pre-installed
  if ! docker compose version &>/dev/null; then
    sudo apt-get install -y docker-compose-plugin 2>/dev/null || \
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
      -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
  fi
fi

echo ""
echo "── Installing Certbot (if not present) ──"
if ! command -v certbot &> /dev/null; then
  sudo apt-get install -y certbot
  echo "✓ Certbot installed"
else
  echo "✓ Certbot already installed"
fi

echo ""
echo "── Getting SSL certificate for $DOMAIN ──"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  # Stop any process on port 80 temporarily
  sudo fuser -k 80/tcp 2>/dev/null || true
  sudo certbot certonly --standalone -d $DOMAIN \
    --non-interactive --agree-tos -m admin@cameeto.com
  echo "✓ SSL certificate obtained"
else
  echo "✓ SSL certificate already exists"
fi

echo ""
echo "── Copying certs into nginx ssl directory ──"
mkdir -p ~/monitor_Perf/nginx/ssl/$DOMAIN
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ~/monitor_Perf/nginx/ssl/$DOMAIN/fullchain.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   ~/monitor_Perf/nginx/ssl/$DOMAIN/privkey.pem
sudo chown \$USER:\$USER ~/monitor_Perf/nginx/ssl/$DOMAIN/*
echo "✓ Certs copied"

echo ""
echo "── Creating backend/.env ──"
if [ ! -f ~/monitor_Perf/backend/.env ]; then
  SECRET_KEY=\$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  cat > ~/monitor_Perf/backend/.env << EOF
SECRET_KEY=\$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=$SERVER_IP,$DOMAIN,localhost

# Database
DB_NAME=perf_monitor
DB_USER=postgres
DB_PASSWORD=PerfMonitor@2024Secure
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://perf-monitor.cameeto.com,https://perf-monitor-mu.vercel.app,https://$DOMAIN

# CSRF (required for Django Admin over HTTPS)
CSRF_TRUSTED_ORIGINS=https://$DOMAIN,https://perf-monitor.cameeto.com

# Google PageSpeed API
GOOGLE_PAGESPEED_API_KEY=

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@cameeto.com

# Alert Thresholds
ALERT_PERFORMANCE_THRESHOLD=80
ALERT_LCP_THRESHOLD=2500
ALERT_CLS_THRESHOLD=0.1
ALERT_INP_THRESHOLD=200

# Scheduler
SCAN_INTERVAL_HOURS=6
EOF
  echo "✓ .env created with auto-generated SECRET_KEY"
else
  echo "✓ .env already exists — skipping"
fi

echo ""
echo "── Starting Docker services ──"
cd ~/monitor_Perf
sudo docker compose down --remove-orphans 2>/dev/null || true
sudo docker compose up -d --build

echo ""
echo "── Waiting for backend to be healthy (up to 90s) ──"
for i in \$(seq 1 18); do
  if sudo docker compose exec -T backend curl -sf http://localhost:8000/api/schema/ > /dev/null 2>&1; then
    echo "✓ Backend is healthy"
    break
  fi
  echo "  waiting... (\$((i*5))s)"
  sleep 5
done

echo ""
echo "── Container status ──"
sudo docker compose ps

REMOTE

echo ""
echo "──────────────────────────────────────────"
echo "  ✅ Deployment complete!"
echo ""
echo "  API:   https://$DOMAIN/api/v1/"
echo "  Admin: https://$DOMAIN/admin/"
echo "  Docs:  https://$DOMAIN/api/docs/"
echo ""
echo "  To create superuser:"
echo "  ssh -i \"$PEM_KEY\" $SERVER_USER@$SERVER_IP"
echo "  cd monitor_Perf && docker compose exec backend python manage.py createsuperuser"
echo "──────────────────────────────────────────"
