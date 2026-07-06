# Deploy Guide - Atheer Global Platform

## Frontend → Cloudflare Pages
```bash
# Build
npm run build

# Deploy with Wrangler
npx wrangler pages deploy ./dist --project-name=atheer-global

# Set environment variables in Cloudflare Dashboard:
# VITE_API_BASE_URL = https://atheer-api-xxxxx-uc.a.run.app
```

## Backend → Google Cloud Run
```bash
# Build & Deploy
gcloud config set project project-71be5dfa-acd9-4a51-93c
gcloud builds submit --config cloudbuild.yaml

# Or build & deploy manually:
docker build -t us-central1-docker.pkg.dev/project-71be5dfa-acd9-4a51-93c/cloud-run-source-deploy/atheer-api .
docker push us-central1-docker.pkg.dev/project-71be5dfa-acd9-4a51-93c/cloud-run-source-deploy/atheer-api
gcloud run deploy atheer-api --image=us-central1-docker.pkg.dev/project-71be5dfa-acd9-4a51-93c/cloud-run-source-deploy/atheer-api --region=us-central1 --allow-unauthenticated
```

## Environment Variables
| Variable | Where | Value |
|----------|-------|-------|
| `VITE_API_BASE_URL` | Cloudflare Pages | `https://atheer-api-xxxxx-uc.a.run.app` |
| `JWT_SECRET` | Cloud Run | Your secret key |
| `CCXT_ENABLED` | Cloud Run | `false` (disable CCXT if no live prices needed) |
