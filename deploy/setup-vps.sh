#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
# ATHEER Global Platform — VPS Deployment Script v2.0
# Tested on: Ubuntu 22.04 / 24.04 LTS
# Usage:    chmod +x setup-vps.sh && sudo ./setup-vps.sh
# ════════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }

if [[ $EUID -ne 0 ]]; then
  err "Please run as root: sudo ./setup-vps.sh"
  exit 1
fi

# ── Config ────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-ccs-technology.com}"
API_DOMAIN="${API_DOMAIN:-api.ccs-technology.com}"
PG_PASSWORD="${PG_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}"
JWT_REFRESH="${JWT_REFRESH:-$(openssl rand -base64 48)}"
NODE_VERSION="${NODE_VERSION:-22}"
APP_DIR="/opt/atheer"

info "═══════════════════════════════════════════════════════════"
info "ATHEER Global — Production Server Setup"
info "Domain:        $DOMAIN"
info "API Domain:    $API_DOMAIN"
info "App Directory: $APP_DIR"
info "═══════════════════════════════════════════════════════════"

# ── 1. System Packages ──────────────────────────────────────
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

info "Installing dependencies..."
apt-get install -y -qq \
  curl wget git build-essential \
  postgresql postgresql-contrib redis-server \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban unattended-upgrades

ok "System packages installed"

# ── 2. Node.js (via NodeSource) ─────────────────────────────
info "Installing Node.js v$NODE_VERSION..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt-get install -y -qq nodejs
npm install -g pm2@latest
ok "Node.js $(node -v) + PM2 installed"

# ── 3. PostgreSQL ───────────────────────────────────────────
info "Configuring PostgreSQL..."
systemctl enable --now postgresql

su - postgres -c "psql -c \"ALTER USER postgres PASSWORD '$PG_PASSWORD';\""
su - postgres -c "createdb atheer" 2>/dev/null || true
su - postgres -c "psql -c 'CREATE DATABASE atheer;'" 2>/dev/null || true

cat > /etc/postgresql/*/main/conf.d/atheer.conf << 'PGSQL'
listen_addresses = 'localhost'
max_connections = 200
shared_buffers = '256MB'
effective_cache_size = '768MB'
work_mem = '16MB'
maintenance_work_mem = '64MB'
wal_buffers = '4MB'
random_page_cost = 1.1
effective_io_concurrency = 200
PGSQL

systemctl restart postgresql
ok "PostgreSQL configured"

# ── 4. Redis ────────────────────────────────────────────────
info "Configuring Redis..."
cat > /etc/redis/atheer.conf << 'REDIS'
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
REDIS

systemctl enable --now redis-server
ok "Redis configured"

# ── 5. Firewall ─────────────────────────────────────────────
info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
ok "Firewall configured"

# ── 6. Fail2Ban ─────────────────────────────────────────────
info "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
FAIL2BAN
systemctl enable --now fail2ban
ok "Fail2Ban configured"

# ── 7. Unattended Upgrades ─────────────────────────────────
info "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'UPGRADES'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
UPGRADES
ok "Automatic upgrades configured"

# ── 8. Create Application User & Directory ─────────────────
info "Setting up application directory..."
useradd -r -s /bin/false atheer 2>/dev/null || true
mkdir -p "$APP_DIR"
chown -R atheer:atheer "$APP_DIR"

# ── 9. Clone / Copy Backend ────────────────────────────────
# IMPORTANT: Upload your backend code to $APP_DIR first!
# For now we just set up the directory structure.
info "NOTE: Upload your backend/ directory contents to $APP_DIR"
info "      Then run: cd $APP_DIR && npm install && npm run build"

# ── 10. Create .env ─────────────────────────────────────────
cat > "$APP_DIR/.env" << ENVEOF
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:${PG_PASSWORD}@localhost:5432/atheer
REDIS_URL=redis://localhost:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ISSUER=atheer
JWT_AUDIENCE=atheer-web
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
AUTH_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
CCXT_ENABLE_RATE_LIMIT=true
ENVEOF
chmod 600 "$APP_DIR/.env"
ok ".env created with secure secrets"

# ── 11. PM2 Ecosystem ───────────────────────────────────────
cat > "$APP_DIR/ecosystem.config.cjs" << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'atheer-api',
    script: 'dist/server.js',
    cwd: '/opt/atheer',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '1G',
    error_file: '/var/log/atheer/error.log',
    out_file: '/var/log/atheer/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
PM2EOF

mkdir -p /var/log/atheer
chown -R atheer:atheer /var/log/atheer

ok "PM2 ecosystem configured"

# ── 12. Nginx (Reverse Proxy) ───────────────────────────────
info "Configuring Nginx..."

# HTTP -> HTTPS redirect
cat > /etc/nginx/sites-available/atheer-api << 'NGINXAPI'
server {
    listen 80;
    server_name api.ccs-technology.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_conn conn_limit 10;
    }
}
NGINXAPI

# Rate limit zones
cat > /etc/nginx/conf.d/atheer-limits.conf << 'LIMITS'
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
LIMITS

ln -sf /etc/nginx/sites-available/atheer-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl enable --now nginx
ok "Nginx configured"

# ── 13. SSL via Certbot ────────────────────────────────────
info "Obtaining SSL certificate for $API_DOMAIN..."
info "Make sure DNS A record for $API_DOMAIN points to this server IP"
info ""
info "Run manually after DNS propagates:"
info "  certbot --nginx -d $API_DOMAIN"
info ""

# ── 14. System Tuning ──────────────────────────────────────
info "Tuning system for production..."
cat >> /etc/sysctl.conf << 'SYSCTL'
# Network tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.rmem_default = 65536
net.core.wmem_default = 65536
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_tw_reuse = 1
SYSCTL
sysctl -p

# Increase open file limits
cat >> /etc/security/limits.conf << 'LIMITS'
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
LIMITS

ok "System tuned"

# ── 15. Create Helper Scripts ──────────────────────────────
cat > /usr/local/bin/atheer-status << 'HELPER'
#!/bin/bash
echo "=== ATHEER Services Status ==="
echo "--- Node.js ---"
node -v && pm2 list
echo ""
echo "--- PostgreSQL ---"
systemctl is-active postgresql
echo "--- Redis ---"
systemctl is-active redis-server
echo "--- Nginx ---"
systemctl is-active nginx
echo "--- UFW ---"
ufw status
echo ""
echo "--- Disk ---"
df -h / | tail -1
echo "--- Memory ---"
free -h | grep Mem
HELPER
chmod +x /usr/local/bin/atheer-status

cat > /usr/local/bin/atheer-deploy << 'HELPER2'
#!/bin/bash
set -e
cd /opt/atheer
echo "Pulling latest code..."
git pull origin main 2>/dev/null || echo "No git repo, skipping pull"
echo "Installing dependencies..."
npm ci --only=production
echo "Building..."
npm run build
echo "Restarting API..."
pm2 reload ecosystem.config.cjs
echo "Deploy complete!"
HELPER2
chmod +x /usr/local/bin/atheer-deploy

ok "Helper scripts created"

# ── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  VPS Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  PostgreSQL Password: $PG_PASSWORD"
echo "  (SAVE THIS — you won't see it again)"
echo ""
echo "  Next Steps:"
echo "  1. Upload your backend code to $APP_DIR"
echo "  2. cd $APP_DIR && npm ci && npm run build"
echo "  3. npm run db:migrate    # Creates tables"
echo "  4. npm run db:seed       # Seeds demo data"
echo "  5. pm2 start ecosystem.config.cjs"
echo "  6. pm2 save && pm2 startup   # Auto-start on reboot"
echo ""
echo "  7. DNS: Point api.ccs-technology.com → (this server IP)"
echo "  8. SSL: certbot --nginx -d $API_DOMAIN"
echo ""
echo "  Cloudflare:"
echo "  - Pages: Deploy dist/ from your frontend build"
echo "  - SSL/TLS: Full (strict) recommended"
echo "  - Always Use HTTPS: ON"
echo ""