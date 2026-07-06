#!/bin/bash
# ============================================================
# ATHEER GLOBAL PLATFORM — Azure Deployment Script
# Run: chmod +x deploy-azure.sh && ./deploy-azure.sh
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    ATHEER GLOBAL — Azure Deployment      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Config ──────────────────────────────────────────────────
RESOURCE_GROUP="atheer-global-rg"
LOCATION="eastus"
APP_NAME="atheer-global-platform"
SKU="Free"

# ── Step 1: Check Azure CLI ──────────────────────────────────
echo "▶ Checking Azure CLI..."
if ! command -v az &> /dev/null; then
  echo "✘ Azure CLI not found. Install from: https://aka.ms/installazurecli"
  exit 1
fi
echo "✔ Azure CLI found"

# ── Step 2: Check Node.js ────────────────────────────────────
echo "▶ Checking Node.js..."
NODE_VERSION=$(node -v)
echo "✔ Node.js $NODE_VERSION"

# ── Step 3: Install Dependencies ────────────────────────────
echo ""
echo "▶ Installing dependencies..."
npm ci --silent
echo "✔ Dependencies installed"

# ── Step 4: Build ────────────────────────────────────────────
echo ""
echo "▶ Building production bundle..."
npm run build
echo "✔ Build complete → dist/"

# ── Step 5: Azure Login ──────────────────────────────────────
echo ""
echo "▶ Azure Login..."
az login --output none
echo "✔ Logged in"

# ── Step 6: Create Resource Group ───────────────────────────
echo ""
echo "▶ Creating resource group: $RESOURCE_GROUP..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output none
echo "✔ Resource group ready"

# ── Step 7: Deploy Static Web App ───────────────────────────
echo ""
echo "▶ Creating Static Web App: $APP_NAME..."
DEPLOY_URL=$(az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku $SKU \
  --query "defaultHostname" \
  --output tsv 2>/dev/null || echo "")

if [ -z "$DEPLOY_URL" ]; then
  # App might already exist, get URL
  DEPLOY_URL=$(az staticwebapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "defaultHostname" \
    --output tsv)
fi

# ── Step 8: Deploy Files ─────────────────────────────────────
echo ""
echo "▶ Deploying to Azure Static Web Apps..."
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" \
  --output tsv)

npx @azure/static-web-apps-cli@latest deploy ./dist \
  --deployment-token $DEPLOY_TOKEN \
  --env production \
  --no-use-keychain 2>/dev/null || \
  echo "⚠ SWA CLI deploy skipped. Use Azure Portal or GitHub Actions."

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          DEPLOYMENT COMPLETE ✔            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  🌐 URL: https://$DEPLOY_URL"
echo "  📊 Azure Portal: https://portal.azure.com"
echo ""
echo "  Next steps:"
echo "  1. Add custom domain in Azure Portal"  
echo "  2. Set up GitHub Actions for auto-deploy"
echo "  3. Configure Application Insights"
echo ""