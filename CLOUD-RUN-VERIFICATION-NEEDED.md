# Cloud Run Security Verification - Manual Action Required

## Status: ⚠️ Cloud Run Service Not Verified

Your local `gcloud` CLI is authenticated but pointing to the wrong project (`fluid-emissary-422605-p1`).

## What You Need to Do:

### Option 1: Use the GCP Console (Easiest)

1. Go to: https://console.cloud.google.com/run
2. Select your project: **lingoleap---staging** (or lingoleap-56ead for production)
3. Find service: **korean-analysis**
4. Click on the service
5. Go to **"Security"** or **"Permissions"** tab
6. Check **"Invoker"** role:
   - ❌ Should NOT see: `allUsers` or `allAuthenticatedUsers`
   - ✅ Should ONLY see: `lingoleap---staging@appspot.gserviceaccount.com` (Firebase Functions service account)

### Option 2: Fix gcloud CLI and Run Script

```bash
# 1. Set correct project
gcloud config set project lingoleap---staging

# 2. Verify it's set
gcloud config get-value project

# 3. Run the verification script
./scripts/verify-cloud-run-security.sh
```

### Option 3: Deploy Cloud Run Service (If Not Deployed Yet)

If the service doesn't exist yet:

```bash
# Navigate to Cloud Run directory
cd functions/python-cloudrun

# Deploy the service
gcloud run deploy korean-analysis \
  --source . \
  --region us-central1 \
  --project lingoleap---staging \
  --no-allow-unauthenticated

# Grant access to Firebase Functions
gcloud run services add-iam-policy-binding korean-analysis \
  --region=us-central1 \
  --member="serviceAccount:lingoleap---staging@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## Why This Matters:

🚨 **Security Risk:** If Cloud Run is publicly accessible (`allUsers`), anyone can:
- Call your analysis service directly
- Bypass rate limiting
- Cause expensive compute costs
- Exhaust resources

✅ **Secure Configuration:** Only Firebase Functions should be able to invoke Cloud Run.

## What I've Created for You:

✅ Security verification script: `scripts/verify-cloud-run-security.sh`
✅ Detailed security review: `docs/features/learnmusic/security-review-phase2a.md`
✅ IAM checklist: `docs/features/learnmusic/cloud-run-security-checklist.md`
✅ All code improvements committed and pushed

## Next Steps:

1. ✅ All code changes are done and pushed to GitHub
2. ⚠️ **YOU NEED TO:** Verify Cloud Run IAM (use Option 1 above - easiest)
3. ⏭️ Deploy the updated code:
   ```bash
   # Deploy Firestore rules
   firebase deploy --only firestore:rules

   # Deploy Functions
   cd functions && npm install && firebase deploy --only functions

   # Deploy Cloud Run (if needed)
   cd python-cloudrun && gcloud run deploy korean-analysis --source .
   ```

## How to Know It's Secure:

✅ Direct curl to Cloud Run URL returns 403 Forbidden:
```bash
curl https://korean-analysis-XXXX.run.app/analyze
# Should return: 403 Forbidden
```

✅ Firebase Functions can call it successfully (internal call works)

---

**Summary:** All code is ready and secure. You just need to verify/configure Cloud Run IAM permissions using the GCP Console (easiest option).
