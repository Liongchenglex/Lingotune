# Korean Lyrics Analysis - Cloud Run Service

Production-grade Cloud Run service for analyzing Korean song lyrics using KoNLPy.

## Architecture

```
Firestore onCreate
   ↓
Firebase Function (analyzeLyricsTrigger)
   ↓
HTTP POST → Cloud Run (analyze-lyrics)
   ↓
4-step NLP analysis
   ↓
Results written to Firestore
   ↓
Lyrics field deleted (copyright protection)
```

## Features

- **Tokenization**: Morpheme splitting with POS tags (KoNLPy Okt)
- **Vocabulary**: Word extraction with difficulty levels
- **Grammar**: Pattern detection (particles, endings, connectors)
- **Pronunciation**: Revised Romanization
- **Copyright protection**: Automatic lyrics deletion after analysis

## Deployment

### Prerequisites

1. Google Cloud SDK installed
2. Firebase project with billing enabled
3. Docker (optional, for local testing)

### Step 1: Deploy Cloud Run Service

```bash
cd functions/python-cloudrun
chmod +x deploy.sh
./deploy.sh
```

This will:
- Build Docker image with Java + Python + KoNLPy
- Deploy to Cloud Run (2Gi memory, 300s timeout)
- Return the service URL

### Step 2: Set Environment Variable

After deployment, set the Cloud Run URL in Firebase Functions:

```bash
# Get the Cloud Run URL from deployment output
SERVICE_URL=$(gcloud run services describe analyze-lyrics \
  --project=lingoleap---staging \
  --region=us-central1 \
  --format='value(status.url)')

# Set it as environment variable for Firebase Functions
firebase functions:config:set \
  analyze_lyrics.cloud_run_url="$SERVICE_URL"
```

### Step 3: Deploy Firebase Function Trigger

```bash
cd ../..  # Back to project root
firebase deploy --only functions:analyzeLyricsTrigger
```

### Step 4: Test

Add a Korean song through your app. Check logs:

```bash
# Cloud Run logs
gcloud run logs read analyze-lyrics \
  --project=lingoleap---staging \
  --region=us-central1

# Firebase Function logs
firebase functions:log --only analyzeLyricsTrigger
```

## Local Development

### Build Docker Image

```bash
docker build -t analyze-lyrics .
```

### Run Locally

```bash
docker run -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json \
  -v /path/to/serviceAccountKey.json:/path/to/serviceAccountKey.json:ro \
  analyze-lyrics
```

### Test Endpoint

```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "songId": "test-123",
    "lyrics": "나를 그냥 짓밟고 가\n괜찮아 돌아보지 마",
    "language": "ko"
  }'
```

## Configuration

### Cloud Run Service

- **Memory**: 2Gi (KoNLPy + Java requires significant memory)
- **CPU**: 1
- **Timeout**: 300s (5 minutes max)
- **Max Instances**: 10 (adjust based on traffic)
- **Min Instances**: 0 (scales to zero when idle)

### Cost Estimate

- **Per song**: ~$0.001 (2Gi memory for 10 seconds)
- **100 songs/month**: ~$0.10
- **1,000 songs/month**: ~$1.00

Much cheaper than Cloud Functions due to better resource utilization.

## Monitoring

### Health Check

```bash
curl https://analyze-lyrics-YOUR-HASH.run.app/health
```

### Cloud Run Metrics

https://console.cloud.google.com/run/detail/us-central1/analyze-lyrics

### Firestore Results

Check `/songs/{songId}/analysis/` for:
- `tokenization`
- `vocabulary`
- `grammar`
- `pronunciation`

## Troubleshooting

### Deployment Fails

**Issue**: Build timeout
**Solution**: Increase build timeout
```bash
gcloud config set builds/timeout 1200
```

### Analysis Fails

**Issue**: Out of memory
**Solution**: Increase memory in `deploy.sh`:
```bash
MEMORY="4Gi"
```

**Issue**: Timeout
**Solution**: Increase timeout in `deploy.sh`:
```bash
TIMEOUT="600s"
```

### Firebase Function Trigger Not Working

**Issue**: Environment variable not set
**Solution**: Verify config:
```bash
firebase functions:config:get
```

## Files

- `Dockerfile` - Multi-stage build with Java + Python
- `requirements.txt` - Python dependencies
- `main.py` - Flask app with /analyze endpoint
- `tokenizer.py` - KoNLPy tokenization
- `vocabulary.py` - Word extraction
- `grammar.py` - Pattern detection
- `pronunciation.py` - Romanization
- `deploy.sh` - Deployment script

## Why Cloud Run?

vs Firebase Functions:

✅ Full Docker control (Java + Python)
✅ No local analysis issues
✅ Better for heavy NLP workloads
✅ More cost-effective
✅ Production-grade architecture
✅ Easier to debug

## Next Steps

1. Monitor first few analyses
2. Adjust memory/timeout if needed
3. Enable Cloud Run min instances for faster cold starts (costs more)
4. Add error alerting
5. Implement retry logic for failed analyses

## Support

For issues, check:
1. Cloud Run logs
2. Firebase Function logs
3. Firestore /analysis/error documents
