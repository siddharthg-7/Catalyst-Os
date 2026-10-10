#!/usr/bin/env bash
# =================================================================
# CatalystOS - Automated Google Cloud Run Deployment Script
# =================================================================
set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}
REGION=${REGION:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: Google Cloud Project ID is not set. Run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

echo "================================================================="
echo "  🚀 Deploying CatalystOS to Google Cloud Run"
echo "  Project: $PROJECT_ID | Region: $REGION"
echo "================================================================="

# 1. Enable Required Google Cloud APIs
echo "📌 [1/4] Ensuring Cloud Run and Artifact Registry APIs are enabled..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# 2. Build and Deploy FastAPI AI Service
echo "📌 [2/4] Building & Deploying FastAPI AI Service..."
gcloud builds submit backend/py_service --tag gcr.io/$PROJECT_ID/catalyst-fastapi:latest

gcloud run deploy catalyst-fastapi \
  --image gcr.io/$PROJECT_ID/catalyst-fastapi:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production \
  --port 8000 \
  --memory 2Gi \
  --cpu 2

FASTAPI_URL=$(gcloud run services describe catalyst-fastapi --region $REGION --format='value(status.url)')
echo "✅ FastAPI Service deployed at: $FASTAPI_URL"

# 3. Build and Deploy Node Gateway Full-Stack Service
echo "📌 [3/4] Building & Deploying CatalystOS Full-Stack Server..."
gcloud builds submit . --tag gcr.io/$PROJECT_ID/catalyst-node-gateway:latest

gcloud run deploy catalyst-node-gateway \
  --image gcr.io/$PROJECT_ID/catalyst-node-gateway:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FASTAPI_URL=$FASTAPI_URL \
  --port 3000 \
  --memory 2Gi \
  --cpu 2

NODE_URL=$(gcloud run services describe catalyst-node-gateway --region $REGION --format='value(status.url)')

echo "================================================================="
echo "  🎉 Deployment Complete!"
echo "  CatalystOS App URL: $NODE_URL"
echo "  FastAPI Backend   : $FASTAPI_URL"
echo "================================================================="
