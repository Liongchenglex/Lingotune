#!/bin/bash

# Deploy Cloud Run service for Korean lyrics analysis

set -e

PROJECT_ID="lingoleap---staging"
SERVICE_NAME="analyze-lyrics"
REGION="us-central1"
MEMORY="2Gi"
CPU="1"
TIMEOUT="300s"
MAX_INSTANCES="10"

echo "🚀 Deploying $SERVICE_NAME to Cloud Run..."

# Build and deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --memory $MEMORY \
  --cpu $CPU \
  --timeout $TIMEOUT \
  --max-instances $MAX_INSTANCES \
  --allow-unauthenticated \
  --platform managed

echo "✅ Deployment complete!"
echo ""
echo "Service URL:"
gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format='value(status.url)'
