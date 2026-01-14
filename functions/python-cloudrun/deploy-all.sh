#!/bin/bash

# Master deployment script for Korean lyrics analysis
# Deploys Cloud Run + Firebase Function trigger automatically

set -e  # Exit on error

PROJECT_ID="lingoleap---staging"
SERVICE_NAME="analyze-lyrics"
REGION="us-central1"

echo "=================================================="
echo "🚀 Automated Deployment: Lyrics Analysis Service"
echo "=================================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Step 1: Deploy Cloud Run
echo "📦 Step 1/4: Deploying Cloud Run service..."
echo "This may take 5-10 minutes (building Docker image with Java + Python + KoNLPy)"
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300s \
  --max-instances 10 \
  --allow-unauthenticated \
  --platform managed \
  --quiet

echo ""
echo "✅ Cloud Run deployed successfully!"
echo ""

# Step 2: Get service URL
echo "🔗 Step 2/4: Getting Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"
echo ""

# Step 3: Set Firebase config
echo "⚙️  Step 3/4: Configuring Firebase Functions..."
cd ../..  # Go to project root

firebase functions:config:set \
  analyze_lyrics.cloud_run_url="$SERVICE_URL" \
  --project $PROJECT_ID

echo ""
echo "✅ Firebase config updated"
echo ""

# Step 4: Deploy Firebase Function trigger
echo "🔥 Step 4/4: Deploying Firebase Function trigger..."
firebase deploy --only functions:analyzeLyricsTrigger \
  --project $PROJECT_ID

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "📝 Summary:"
echo "  - Cloud Run URL: $SERVICE_URL"
echo "  - Firebase Trigger: analyzeLyricsTrigger"
echo "  - Status: Ready to process Korean songs"
echo ""
echo "🧪 Next Steps:"
echo "  1. Add a Korean song through your app"
echo "  2. Check Firestore: /songs/{songId}/analysis/"
echo "  3. Monitor logs:"
echo "     - Cloud Run: gcloud run logs read $SERVICE_NAME --project=$PROJECT_ID --region=$REGION"
echo "     - Firebase: firebase functions:log --only analyzeLyricsTrigger"
echo ""
echo "💰 Cost: ~\$0.001 per song analysis"
echo ""
