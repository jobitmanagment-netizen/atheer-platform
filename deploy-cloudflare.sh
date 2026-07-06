#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Atheer Global Platform — Cloudflare Pages Deploy
# Run this in Azure Cloud Shell or any bash environment
# Requires: CLOUDFLARE_API_TOKEN
# ─────────────────────────────────────────────────────────────

set -e

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set."
  echo ""
  echo "To get a token:"
  echo "  1. Go to https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Click 'Create Token' → 'Edit Cloudflare Workers' template"
  echo "  3. Under Permissions, add: Account → Cloudflare Pages → Edit"
  echo "  4. Click 'Continue to Summary' → 'Create Token'"
  echo "  5. Copy the token and run:"
  echo "     export CLOUDFLARE_API_TOKEN='your-token-here'"
  echo "     bash deploy-cloudflare.sh"
  exit 1
fi

ACCOUNT_EMAIL=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

echo "═══ Cloudflare Pages Deploy ═══"
echo "Account: $ACCOUNT_EMAIL"
echo ""

# ── Build ──
echo "▶ Building frontend..."
npm install --omit=dev 2>/dev/null
npm run build

# ── Create Project ──
PROJECT_NAME="atheer-global"
echo "▶ Creating/updating Pages project '$PROJECT_NAME'..."
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$(curl -s -H 'Authorization: Bearer '$CLOUDFLARE_API_TOKEN' https://api.cloudflare.com/client/v4/accounts' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)/pages/projects" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"name\":\"$PROJECT_NAME\",\"production_branch\":\"main\"}" \
  > /dev/null 2>&1 || true

# ── Upload ──
echo "▶ Uploading dist/ to Cloudflare Pages..."
npx wrangler pages deploy ./dist --project-name=$PROJECT_NAME

echo ""
echo "✅ Frontend deployed to Cloudflare Pages!"
echo "   Set VITE_API_BASE_URL in Cloudflare Pages → Settings → Environment Variables"
echo "   to your Azure backend URL (https://your-app.azurewebsites.net)"
