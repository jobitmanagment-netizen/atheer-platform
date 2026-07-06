#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Atheer Global Platform — Azure Deployment Script
# Run this in Azure Cloud Shell (shell.azure.com)
# ─────────────────────────────────────────────────────────────

set -e

RESOURCE_GROUP="atheer-rg"
APP_NAME="atheer-api-$(date +%s | tail -c 6)"   # must be globally unique
LOCATION="eastus"
SKU="B1"  # B1 = $13.87/month (uses your $200 credit)
NODE_VERSION="20"

echo "═══ Atheer Global Platform — Azure Deploy ═══"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "App Name:       $APP_NAME"
echo "Location:       $LOCATION"
echo "SKU:            $SKU"
echo ""

# ── Login check ──
echo "▶ Checking login..."
az account show &>/dev/null || { echo "ERROR: Not logged in. Run 'az login' first."; exit 1; }

# ── Create Resource Group ──
echo "▶ Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none

# ── Create App Service Plan ──
echo "▶ Creating App Service Plan (B1 — $13.87/mo, covered by your \$200 credit)..."
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --sku $SKU \
  --is-linux \
  --output none

# ── Create Web App with Node.js ──
echo "▶ Creating Web App (Node.js $NODE_VERSION)..."
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --runtime "NODE:20-lts" \
  --output none

# ── Configure Web App ──
echo "▶ Configuring environment variables..."
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    JWT_SECRET="atheer-jwt-$(openssl rand -hex 16)" \
    CCXT_ENABLED=false \
    CORS_ORIGIN="*" \
  --output none

az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node server/index.mjs" \
  --output none

# ── Enable WebSocket ──
echo "▶ Enabling WebSocket..."
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --web-sockets-enabled true \
  --output none

# ── Zip & Deploy ──
echo "▶ Deploying source code..."
cd /home/$USER
if [ -d "CCS-Technology" ]; then
  cd CCS-Technology
  # Install deps & build
  npm install --omit=dev
  npm run build 2>/dev/null || echo "  (build skipped — continuing)"
  # Deploy via zip
  echo "  Zipping..."
  zip -rq /tmp/deploy.zip . -x "node_modules/.cache/*" ".git/*"
  echo "  Uploading..."
  az webapp deploy \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --src-path /tmp/deploy.zip \
    --type zip \
    --output none
else
  echo "ERROR: Folder 'CCS-Technology' not found in Cloud Shell home."
  echo "       Please upload the project folder to Cloud Shell first."
  exit 1
fi

# ── Done ──
URL="https://$APP_NAME.azurewebsites.net"
echo ""
echo "═══════════════════════════════════════════"
echo "✅ DEPLOY COMPLETE!"
echo ""
echo "   Frontend (Cloudflare): upload dist/ to Cloudflare Pages"
echo "   Backend URL:           $URL"
echo "   Health check:          $URL/api/health"
echo ""
echo "   In Cloudflare Pages, set env variable:"
echo "   VITE_API_BASE_URL = $URL"
echo ""
echo "   To view logs:"
echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "═══════════════════════════════════════════"
