# Deployment Guide - Python Cloud Functions

**Status:** Ready for deployment
**Last Updated:** 2026-01-13

---

## Prerequisites

### 1. Firebase Project Setup
- ✅ Firebase project created
- ✅ Billing enabled (required for Cloud Functions 2nd gen)
- ✅ Firebase CLI installed (`npm install -g firebase-tools`)
- ✅ Authenticated (`firebase login`)

### 2. Local Development Setup (Optional)
- Python 3.11+
- Java 11+ (for KoNLPy)
- Virtual environment

---

## Quick Start

### Option A: Deploy Without Local Testing

```bash
# From project root
firebase deploy --only functions:analyze_lyrics
```

This will:
1. Build Python function in Cloud
2. Install dependencies from `requirements.txt`
3. Deploy `analyze_lyrics` function

**Note:** First deployment may take 5-10 minutes.

---

### Option B: Test Locally First

#### 1. Install Java (if not already installed)

```bash
# macOS
brew install openjdk@11

# Set JAVA_HOME
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@11' >> ~/.zshrc
export JAVA_HOME=/opt/homebrew/opt/openjdk@11

# Verify
java -version
```

#### 2. Run Setup Script

```bash
cd functions/python
chmod +x setup.sh
./setup.sh
```

This will:
- Check Python and Java versions
- Create virtual environment
- Install all dependencies
- Test KoNLPy installation

#### 3. Test Individual Modules

```bash
# Activate virtual environment
source functions/python/venv/bin/activate

# Test each module
cd functions/python
python tokenizer.py
python vocabulary.py
python grammar.py
python pronunciation.py
```

Expected output: Each module should run test function successfully.

#### 4. Deploy

```bash
# From project root (deactivate venv first)
deactivate
firebase deploy --only functions:analyze_lyrics
```

---

## Deployment Configuration

### firebase.json

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["python"]
    },
    {
      "source": "functions/python",
      "codebase": "python-functions",
      "runtime": "python311"
    }
  ]
}
```

### Function Configuration

Location: `functions/python/main.py`

```python
@firestore_fn.on_document_created(
    document="songs/{song_id}",
    timeout_sec=300,  # 5 minutes
    memory=options.MemoryOption.MB_1GB
)
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check function deployment status
firebase functions:list

# Expected output:
# analyze_lyrics (python311)
```

### 2. Monitor Logs

```bash
# Real-time logs
firebase functions:log --only analyze_lyrics

# Or view in Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

### 3. Test with Real Data

Add a test song to Firestore:

```javascript
// In Firebase Console or via script
db.collection('songs').add({
  id: 'test-song-001',
  title: 'Test Song',
  artist: 'Test Artist',
  lyrics: '나를 그냥 짓밟고 가\n괜찮아 돌아보지 마',
  language: 'ko',
  addedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

Check logs for processing:
```bash
firebase functions:log --only analyze_lyrics
```

Expected logs:
```
🎵 Starting analysis for song test-song-001
[1/4] Tokenizing lyrics...
✅ Tokenization complete: 12 tokens
[2/4] Extracting vocabulary...
✅ Vocabulary complete: 8 unique words
[3/4] Analyzing grammar...
✅ Grammar complete: 3 patterns
[4/4] Generating pronunciation...
✅ Pronunciation complete
🎉 Analysis complete for song test-song-001
```

Verify results in Firestore:
```
/songs/test-song-001/analysis/
  ├── tokenization
  ├── vocabulary
  ├── grammar
  └── pronunciation
```

---

## Troubleshooting

### Deployment Fails: "Python runtime not supported"

**Problem:** Firebase project doesn't support Python Cloud Functions (2nd gen)

**Solution:**
1. Ensure billing is enabled
2. Update Firebase CLI: `npm install -g firebase-tools@latest`
3. Upgrade to Blaze plan if on Spark plan

---

### Function Times Out

**Problem:** Function exceeds 300s timeout

**Solution:**
1. Increase timeout in `main.py`:
```python
timeout_sec=540  # Max allowed
```

2. Or optimize processing (currently ~6s for typical song)

---

### Memory Limit Exceeded

**Problem:** KoNLPy initialization uses too much memory

**Solution:**
Increase memory in `main.py`:
```python
memory=options.MemoryOption.MB_2GB  # or MB_4GB
```

**Note:** Higher memory = higher cost

---

### KoNLPy Import Error

**Problem:** `konlpy` fails to import or can't find Java

**Solution:**
This should not happen in Cloud (Java is pre-installed), but if it does:
1. Check `requirements.txt` includes `konlpy` and `JPype1`
2. Redeploy with `--force` flag:
```bash
firebase deploy --only functions:analyze_lyrics --force
```

---

### Analysis Not Triggering

**Problem:** Songs added but `analyze_lyrics` doesn't run

**Solution:**
1. Check function deployed successfully:
```bash
firebase functions:list
```

2. Check trigger configuration in `main.py`:
```python
document="songs/{song_id}"  # Must match your collection name
```

3. Verify song has required fields:
- `lyrics` (string, not empty)
- `language` (must be "ko")

4. Check if analysis already exists (function skips if vocabulary doc exists)

---

### Firestore Permission Denied

**Problem:** Function can't write to Firestore

**Solution:**
Cloud Functions have admin access by default. If issue persists:
1. Check Firestore security rules don't block writes from functions
2. Verify Firebase Admin SDK is initialized:
```python
from firebase_admin import initialize_app
initialize_app()
```

---

## Cost Estimates

### Compute Costs

**Function Configuration:**
- Memory: 1GB
- Average execution time: 6 seconds
- Estimated cost per invocation: ~$0.0001

**Monthly Estimates:**
- 100 songs/month: ~$0.01
- 1,000 songs/month: ~$0.10
- 10,000 songs/month: ~$1.00

### Firestore Costs

**Writes per analysis:**
- 4 documents (tokenization, vocabulary, grammar, pronunciation)
- Cost per analysis: ~$0.000004

**Negligible compared to compute costs**

### Total Estimated Monthly Cost

**For 1,000 songs:** ~$0.10-0.15/month

---

## Monitoring & Alerts

### Set Up Monitoring

1. **Firebase Console:**
   - Go to Functions > analyze_lyrics
   - View invocations, errors, execution time

2. **Cloud Logging:**
   - Search for: `resource.labels.function_name="analyze_lyrics"`

3. **Set Up Alerts:**
   - Error rate > 5%
   - Execution time > 30s (p95)
   - Memory usage > 800MB

### Key Metrics to Watch

- **Invocations:** Should match song additions
- **Errors:** Should be < 1%
- **Execution time:** Should be ~6s average
- **Memory usage:** Should be < 500MB average

---

## Rollback

If deployment causes issues:

```bash
# Rollback to previous version
firebase functions:delete analyze_lyrics
firebase deploy --only functions:analyze_lyrics --version=PREVIOUS_VERSION

# Or just delete the function
firebase functions:delete analyze_lyrics
```

---

## Next Steps After Deployment

1. **Integrate with Frontend:**
   - Update LyricsScreen to listen for analysis results
   - Display vocabulary, grammar, pronunciation

2. **Add Dictionary API:**
   - Replace hardcoded definitions with Naver Dictionary API
   - See `vocabulary.py` TODO comments

3. **Optimize Performance:**
   - Cache KoNLPy initialization (already done via global variable)
   - Consider batching multiple songs

4. **Add AI Analysis (Phase 2B/C):**
   - Integrate Claude API for semantic analysis
   - Add emotion analysis

---

## Support

For deployment issues:
1. Check logs: `firebase functions:log`
2. Review this guide's Troubleshooting section
3. Check Firebase Console > Functions for errors
4. Verify all prerequisites are met

---

**Deployment Checklist:**
- [ ] Billing enabled
- [ ] Firebase CLI updated
- [ ] firebase.json configured
- [ ] Local testing complete (optional)
- [ ] Deploy command executed
- [ ] Function appears in `firebase functions:list`
- [ ] Test song triggers analysis
- [ ] Results appear in Firestore
- [ ] Logs show successful processing

Once all checked, you're ready to go! 🎉
