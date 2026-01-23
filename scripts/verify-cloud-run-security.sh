#!/bin/bash

# Verify Cloud Run Security Script
# This script checks if your Cloud Run service is properly secured

set -e

echo "=================================================="
echo "Cloud Run Security Verification Script"
echo "=================================================="
echo ""

# Get project ID from Firebase
if [ -z "$PROJECT_ID" ]; then
    # Try to read from .firebaserc
    if [ -f ".firebaserc" ]; then
        PROJECT_ID=$(cat .firebaserc | grep -o '"default": "[^"]*"' | cut -d'"' -f4)
    fi
fi

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not determine Firebase project ID"
    echo "Please set PROJECT_ID environment variable or ensure .firebaserc exists"
    echo "Example: PROJECT_ID=your-project-id ./scripts/verify-cloud-run-security.sh"
    exit 1
fi

echo "📋 Project ID: $PROJECT_ID"
echo ""

# Cloud Run service details
SERVICE_NAME="korean-analysis"
REGION="us-central1"

echo "🔍 Checking Cloud Run service: $SERVICE_NAME"
echo "🌍 Region: $REGION"
echo ""

# Check if service exists
echo "1️⃣ Checking if service exists..."
if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo "✅ Service exists"
else
    echo "❌ Service not found or you don't have permission"
    echo ""
    echo "Possible reasons:"
    echo "  1. Service hasn't been deployed yet"
    echo "  2. Service name is different"
    echo "  3. Region is different"
    echo "  4. You need to authenticate: gcloud auth login"
    echo ""
    echo "To deploy the service, run:"
    echo "  cd functions/python-cloudrun"
    echo "  gcloud run deploy $SERVICE_NAME --source . --region $REGION --project $PROJECT_ID"
    exit 1
fi

echo ""
echo "2️⃣ Checking IAM policy..."

# Get IAM policy
IAM_POLICY=$(gcloud run services get-iam-policy $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format=json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to get IAM policy"
    echo "Error: $IAM_POLICY"
    exit 1
fi

echo "✅ Retrieved IAM policy"
echo ""

# Check for public access
echo "3️⃣ Checking for public access..."
if echo "$IAM_POLICY" | grep -q "allUsers"; then
    echo "⚠️  WARNING: Service is publicly accessible!"
    echo "   Found: allUsers"
    echo ""
    echo "To fix, run:"
    echo "  gcloud run services remove-iam-policy-binding $SERVICE_NAME \\"
    echo "    --region=$REGION \\"
    echo "    --project=$PROJECT_ID \\"
    echo "    --member='allUsers' \\"
    echo "    --role='roles/run.invoker'"
    PUBLIC_ACCESS=true
else
    echo "✅ No public access (allUsers not found)"
    PUBLIC_ACCESS=false
fi

if echo "$IAM_POLICY" | grep -q "allAuthenticatedUsers"; then
    echo "⚠️  WARNING: Service is accessible to all authenticated users!"
    echo "   Found: allAuthenticatedUsers"
    echo ""
    echo "To fix, run:"
    echo "  gcloud run services remove-iam-policy-binding $SERVICE_NAME \\"
    echo "    --region=$REGION \\"
    echo "    --project=$PROJECT_ID \\"
    echo "    --member='allAuthenticatedUsers' \\"
    echo "    --role='roles/run.invoker'"
    PUBLIC_ACCESS=true
else
    echo "✅ No authenticated users access (allAuthenticatedUsers not found)"
fi

echo ""
echo "4️⃣ Checking Firebase Functions service account access..."

# Firebase Functions service account
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

if echo "$IAM_POLICY" | grep -q "$SERVICE_ACCOUNT"; then
    echo "✅ Firebase Functions service account has access"
    echo "   Account: $SERVICE_ACCOUNT"
else
    echo "⚠️  WARNING: Firebase Functions service account does NOT have access!"
    echo "   Expected: $SERVICE_ACCOUNT"
    echo ""
    echo "To fix, run:"
    echo "  gcloud run services add-iam-policy-binding $SERVICE_NAME \\"
    echo "    --region=$REGION \\"
    echo "    --project=$PROJECT_ID \\"
    echo "    --member='serviceAccount:$SERVICE_ACCOUNT' \\"
    echo "    --role='roles/run.invoker'"
fi

echo ""
echo "5️⃣ Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format='value(status.url)' 2>/dev/null)

if [ -n "$SERVICE_URL" ]; then
    echo "✅ Service URL: $SERVICE_URL"
else
    echo "⚠️  Could not retrieve service URL"
fi

echo ""
echo "=================================================="
echo "Security Assessment"
echo "=================================================="

if [ "$PUBLIC_ACCESS" = true ]; then
    echo "🔴 SECURITY ISSUE: Service is publicly accessible"
    echo ""
    echo "Next steps:"
    echo "1. Remove public access (see commands above)"
    echo "2. Grant access to Firebase Functions service account"
    echo "3. Re-run this script to verify"
    echo ""
    exit 1
else
    echo "🟢 SECURE: Service is not publicly accessible"
    echo ""
    echo "✅ All security checks passed!"
    echo ""
    echo "Your Cloud Run service is properly secured."
    echo "Only authorized service accounts can invoke it."
fi

echo ""
echo "=================================================="
echo "Testing Access (Optional)"
echo "=================================================="
echo ""
echo "To test that direct access is blocked:"
echo "  curl $SERVICE_URL/analyze"
echo ""
echo "Expected result: 403 Forbidden"
echo ""
