# Quick Start - Cloud Run Deployment

## TL;DR

```bash
# 1. Deploy Cloud Run service
cd functions/python-cloudrun
chmod +x deploy.sh
./deploy.sh

# 2. Copy the service URL from output, then set it:
firebase functions:config:set analyze_lyrics.cloud_run_url="YOUR_SERVICE_URL"

# 3. Deploy Firebase Function trigger
cd ../..
firebase deploy --only functions:analyzeLyricsTrigger

# 4. Test by adding a Korean song in your app
```

## What This Does

**Before (Firebase Python Functions - didn't work):**
```
Song added → Python Function (KoNLPy needs Java) → ❌ Deployment fails
```

**After (Cloud Run - production architecture):**
```
Song added → Firebase Trigger → Cloud Run (Java + Python) → ✅ Analysis works
```

## Step-by-Step

### 1. Deploy to Cloud Run (~5 minutes)

```bash
cd functions/python-cloudrun
./deploy.sh
```

Wait for deployment. You'll see:
```
✅ Deployment complete!

Service URL:
https://analyze-lyrics-xxxxx-uc.a.run.app
```

**Copy this URL!**

### 2. Configure Firebase Function (~1 minute)

```bash
# Replace with your actual URL
firebase functions:config:set \
  analyze_lyrics.cloud_run_url="https://analyze-lyrics-xxxxx-uc.a.run.app"
```

Verify:
```bash
firebase functions:config:get
```

Should show:
```json
{
  "analyze_lyrics": {
    "cloud_run_url": "https://analyze-lyrics-xxxxx-uc.a.run.app"
  }
}
```

### 3. Deploy Firebase Trigger (~2 minutes)

```bash
cd ../..  # Back to project root
firebase deploy --only functions:analyzeLyricsTrigger
```

### 4. Test It

Add a Korean song through your app, then check Firestore:

```
/songs/{songId}/
  └── analysis/
      ├── tokenization (tokens with POS tags)
      ├── vocabulary (words with definitions)
      ├── grammar (detected patterns)
      └── pronunciation (romanization)
```

**Lyrics field should be deleted** after analysis (copyright protection).

## Monitoring

### Check Cloud Run logs:
```bash
gcloud run logs read analyze-lyrics \
  --project=lingoleap---staging \
  --region=us-central1 \
  --tail=50
```

### Check Firebase logs:
```bash
firebase functions:log --only analyzeLyricsTrigger
```

## Troubleshooting

**"Service URL not set"**
→ Make sure you ran step 2 and redeployed the trigger

**"Permission denied"**
→ Cloud Run is deployed as `--allow-unauthenticated` so this shouldn't happen

**"Out of memory"**
→ Edit `deploy.sh`, change `MEMORY="2Gi"` to `MEMORY="4Gi"`, redeploy

**"Timeout"**
→ Edit `deploy.sh`, change `TIMEOUT="300s"` to `TIMEOUT="600s"`, redeploy

## Cost

- ~$0.001 per song analysis
- ~$1/month for 1,000 songs
- Scales to zero when idle (no charges)

Much cheaper than keeping Cloud Functions warm!

## Done!

Your Korean lyrics analysis is now running on production-grade Cloud Run infrastructure with full Java + Python support.

Next: Update your frontend to display the analysis results!
