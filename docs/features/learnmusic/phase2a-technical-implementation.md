# Phase 2A: Korean Lyrics Analysis - Technical Implementation

**Date:** 2026-01-14
**Status:** ✅ Deployed to Production
**Architecture:** Cloud Run + Firebase Functions Trigger

---

## Overview

This document describes the production implementation of Korean lyrics analysis using Cloud Run with KoNLPy for natural language processing. The system automatically analyzes Korean song lyrics when they're added to Firestore, generating tokenization, vocabulary, grammar, and pronunciation data.

---

## Architecture

### System Flow

```
User adds Korean song
    ↓
Firestore /songs/{songId} created
    ↓
Firebase Function (analyzeLyricsTrigger) triggered
    ↓
HTTP POST → Cloud Run Service (analyze-lyrics)
    ↓
4-Step NLP Analysis Pipeline:
    1. Tokenization (KoNLPy Okt)
    2. Vocabulary Extraction
    3. Grammar Pattern Detection
    4. Pronunciation (Revised Romanization)
    ↓
Results written to Firestore /songs/{songId}/analysis/
    ↓
Lyrics field deleted (copyright protection)
    ↓
Analysis complete
```

### Why Cloud Run Instead of Firebase Functions?

**Problem with Firebase Functions:**
- Firebase Python Functions (2nd Gen) cannot handle Java dependencies
- KoNLPy requires Java Runtime Environment (JRE)
- Deployment failed with "No JVM shared library file (libjvm.so) found"

**Solution: Cloud Run**
- Full Docker container control
- Can install Java 21 + Python 3.11 in same container
- Better for heavy NLP workloads
- More cost-effective for compute-intensive tasks
- Production-grade architecture

---

## Technical Stack

### Cloud Run Service

**Container:** Docker (multi-stage build)
- **Base Image:** `python:3.11-slim` (Debian)
- **Java:** OpenJDK 21 JRE (headless)
- **Python:** 3.11
- **Web Server:** Gunicorn + Flask

**Resources:**
- **Memory:** 2Gi (KoNLPy + Java requires significant memory)
- **CPU:** 1 vCPU
- **Timeout:** 300s (5 minutes max per request)
- **Max Instances:** 10 (auto-scaling)
- **Min Instances:** 0 (scales to zero when idle)

**Endpoint:**
- **URL:** `https://analyze-lyrics-mecb6iueja-uc.a.run.app`
- **Route:** `POST /analyze`
- **Health:** `GET /health`

### Firebase Function Trigger

**Function:** `analyzeLyricsTrigger`
- **Runtime:** Node.js 20 (1st Gen)
- **Trigger:** Firestore `onCreate` on `/songs/{songId}`
- **Memory:** 256MB (lightweight - just triggers Cloud Run)
- **Timeout:** 60s
- **Purpose:** Validate input and call Cloud Run service

---

## File Structure

```
/functions/
├── src/
│   ├── index.ts (exports analyzeLyricsTrigger)
│   └── analyzeLyricsTrigger.ts (Firebase trigger logic)
│
└── python-cloudrun/
    ├── Dockerfile (Java 21 + Python 3.11)
    ├── requirements.txt (Python dependencies)
    ├── main.py (Flask app + analysis orchestration)
    ├── tokenizer.py (KoNLPy tokenization)
    ├── vocabulary.py (word extraction)
    ├── grammar.py (pattern detection)
    ├── pronunciation.py (romanization)
    ├── deploy-all.sh (automated deployment script)
    ├── .dockerignore
    ├── README.md
    └── DEPLOY_QUICKSTART.md
```

---

## Code Details

### 1. Dockerfile

**File:** `/functions/python-cloudrun/Dockerfile`

```dockerfile
FROM python:3.11-slim

# Install Java 21 (required for KoNLPy)
RUN apt-get update && apt-get install -y \
    openjdk-21-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Run Flask app with Gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 300 main:app
```

**Key Points:**
- Uses Debian Trixie (from python:3.11-slim)
- Java 21 instead of Java 17 (Java 17 no longer available in Debian Trixie)
- Single worker to manage memory (KoNLPy is memory-intensive)
- 8 threads for concurrent requests
- 300s timeout matches Cloud Run config

### 2. Firebase Function Trigger

**File:** `/functions/src/analyzeLyricsTrigger.ts`

```typescript
const CLOUD_RUN_URL = functions.config().analyze_lyrics?.cloud_run_url || '';

export const analyzeLyricsTrigger = functions.firestore
  .document('songs/{songId}')
  .onCreate(async (snapshot, context) => {
    const songId = context.params.songId;
    const songData = snapshot.data();

    // Validation
    if (!songData.lyrics) {
      await saveError(songId, 'No lyrics found', false);
      return;
    }

    if (songData.language !== 'ko') {
      await saveError(songId, `Language ${songData.language} not supported yet`, false);
      return;
    }

    // Check if already analyzed
    const vocabDoc = await admin.firestore()
      .collection('songs').doc(songId)
      .collection('analysis').doc('vocabulary')
      .get();

    if (vocabDoc.exists) {
      return; // Skip duplicate analysis
    }

    // Call Cloud Run service
    const response = await axios.post(
      `${CLOUD_RUN_URL}/analyze`,
      {
        songId: songId,
        lyrics: songData.lyrics,
        language: songData.language,
      },
      { timeout: 300000 } // 5 minutes
    );

    functions.logger.info(`✅ Analysis complete for song ${songId}`);
  });
```

**Key Points:**
- Reads Cloud Run URL from Firebase Functions config (set during deployment)
- Validates lyrics exist and language is Korean
- Prevents duplicate analysis by checking if vocabulary document exists
- Calls Cloud Run with 5-minute timeout
- Saves errors to `/songs/{songId}/analysis/error` on failure

### 3. Cloud Run Main Application

**File:** `/functions/python-cloudrun/main.py`

```python
@app.route('/analyze', methods=['POST'])
def analyze_lyrics_endpoint():
    """HTTP endpoint for lyrics analysis"""
    data = request.get_json()
    song_id = data.get('songId')
    lyrics = data.get('lyrics')
    language = data.get('language', 'ko')

    # Validation
    if not song_id or not lyrics or language != 'ko':
        return jsonify({'error': 'Invalid request'}), 400

    # Run 4-step analysis pipeline
    result = analyze_lyrics(song_id, lyrics, language)
    return jsonify({'success': True, 'songId': song_id, 'result': result}), 200

def analyze_lyrics(song_id: str, lyrics: str, language: str) -> dict:
    """Main analysis pipeline"""
    # Step 1: Tokenization
    tokenization_result = tokenize_lyrics(lyrics)
    save_to_firestore(song_id, 'tokenization', tokenization_result)

    # Step 2: Vocabulary
    vocabulary_result = extract_vocabulary(tokenization_result)
    save_to_firestore(song_id, 'vocabulary', vocabulary_result)

    # Step 3: Grammar
    grammar_result = analyze_grammar(tokenization_result)
    save_to_firestore(song_id, 'grammar', grammar_result)

    # Step 4: Pronunciation
    pronunciation_result = generate_pronunciation(lyrics)
    save_to_firestore(song_id, 'pronunciation', pronunciation_result)

    # Step 5: Delete lyrics (copyright protection)
    delete_lyrics(song_id)

    return {
        'status': 'completed',
        'tokenCount': len(tokenization_result.get('tokens', [])),
        'vocabularyCount': len(vocabulary_result.get('words', [])),
        'grammarPatternCount': len(grammar_result.get('patterns', []))
    }
```

**Key Points:**
- Flask app with `/analyze` POST endpoint
- 5-step pipeline: tokenization → vocabulary → grammar → pronunciation → delete lyrics
- Each step saves results to Firestore immediately
- Lazy initialization of Firestore and KoNLPy (prevents timeout during cold starts)
- Returns summary statistics

### 4. Tokenization (KoNLPy)

**File:** `/functions/python-cloudrun/tokenizer.py`

```python
from konlpy.tag import Okt

okt = None

def _get_tokenizer():
    """Lazy load KoNLPy Okt tokenizer"""
    global okt
    if okt is None:
        okt = Okt()
    return okt

def tokenize_lyrics(lyrics: str) -> dict:
    """Tokenize Korean lyrics using KoNLPy Okt"""
    okt = _get_tokenizer()

    lines = lyrics.strip().split('\n')
    tokens = []

    for line in lines:
        if not line.strip():
            continue

        # pos() returns [(word, POS_tag), ...]
        morphemes = okt.pos(line, norm=True, stem=True)

        for word, pos in morphemes:
            tokens.append({
                'surface': word,
                'pos': pos,
                'line': line
            })

    return {
        'tokens': tokens,
        'processedAt': firestore.SERVER_TIMESTAMP
    }
```

**Key Points:**
- Uses KoNLPy Okt (Twitter-based tokenizer, good for informal text like lyrics)
- `norm=True` normalizes variations (e.g., "ㅋㅋ" → "크크")
- `stem=True` extracts verb stems
- POS tags: NP (noun), VV (verb), JKO (object particle), etc.
- Lazy initialization prevents import-time errors

### 5. Vocabulary Extraction

**File:** `/functions/python-cloudrun/vocabulary.py`

```python
def extract_vocabulary(tokenization_result: dict) -> dict:
    """Extract vocabulary words from tokenized lyrics"""
    tokens = tokenization_result.get('tokens', [])
    vocabulary = {}

    for token in tokens:
        surface = token['surface']
        pos = token['pos']

        # Filter: only nouns, verbs, adjectives, adverbs
        if pos not in ['Noun', 'Verb', 'Adjective', 'Adverb']:
            continue

        # Skip single-character words (particles, etc.)
        if len(surface) < 2:
            continue

        if surface not in vocabulary:
            vocabulary[surface] = {
                'word': surface,
                'pos': pos,
                'count': 0,
                'lines': []
            }

        vocabulary[surface]['count'] += 1
        vocabulary[surface]['lines'].append(token['line'])

    return {
        'words': list(vocabulary.values()),
        'processedAt': firestore.SERVER_TIMESTAMP
    }
```

**Key Points:**
- Filters for content words (nouns, verbs, adjectives, adverbs)
- Tracks word frequency and line locations
- Future: integrate dictionary API for definitions

### 6. Grammar Pattern Detection

**File:** `/functions/python-cloudrun/grammar.py`

```python
GRAMMAR_PATTERNS = {
    'Josa': 'Particle (case marker)',
    'Eomi': 'Verb ending',
    'Suffix': 'Suffix'
}

def analyze_grammar(tokenization_result: dict) -> dict:
    """Detect grammar patterns in tokenized lyrics"""
    tokens = tokenization_result.get('tokens', [])
    patterns = []

    for token in tokens:
        pos = token['pos']

        if pos in GRAMMAR_PATTERNS:
            patterns.append({
                'surface': token['surface'],
                'type': GRAMMAR_PATTERNS[pos],
                'pos': pos,
                'line': token['line']
            })

    return {
        'patterns': patterns,
        'processedAt': firestore.SERVER_TIMESTAMP
    }
```

**Key Points:**
- Identifies particles (를/을, 이/가, etc.)
- Detects verb endings (-고, -아/어, etc.)
- Future: rule-based pattern explanations (e.g., "-고 = sequential connector")

### 7. Pronunciation (Romanization)

**File:** `/functions/python-cloudrun/pronunciation.py`

```python
from hangul_romanize import Transliter
from hangul_romanize.rule import academic

def generate_pronunciation(lyrics: str) -> dict:
    """Generate romanization for Korean lyrics"""
    transliter = Transliter(academic)

    lines = lyrics.strip().split('\n')
    romanizations = []

    for line in lines:
        if not line.strip():
            continue

        romanized = transliter.translit(line)
        romanizations.append({
            'original': line,
            'romanization': romanized
        })

    return {
        'romanizations': romanizations,
        'processedAt': firestore.SERVER_TIMESTAMP
    }
```

**Key Points:**
- Uses Revised Romanization of Korean (official standard)
- Line-by-line romanization
- Future: add IPA (International Phonetic Alphabet)

---

## Deployment

### Automated Deployment Script

**File:** `/functions/python-cloudrun/deploy-all.sh`

```bash
#!/bin/bash
set -e

PROJECT_ID="lingoleap---staging"
SERVICE_NAME="analyze-lyrics"
REGION="us-central1"

# Step 1: Deploy Cloud Run
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

# Step 2: Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format='value(status.url)')

# Step 3: Set Firebase config
cd ../..
firebase functions:config:set \
  analyze_lyrics.cloud_run_url="$SERVICE_URL" \
  --project $PROJECT_ID

# Step 4: Deploy Firebase Function trigger
firebase deploy --only functions:analyzeLyricsTrigger \
  --project $PROJECT_ID
```

**Deployment Steps:**
1. Build Docker image with Java + Python + KoNLPy (5-10 minutes)
2. Deploy to Cloud Run
3. Get service URL automatically
4. Set URL in Firebase Functions config
5. Deploy Firebase Function trigger

**To deploy:**
```bash
cd functions/python-cloudrun
chmod +x deploy-all.sh
./deploy-all.sh
```

---

## Firestore Data Structure

### Song Document

```
/songs/{songId}
{
  id: "song-ko-001",
  title: "Song Title",
  artist: "Artist Name",
  language: "ko",
  lyricsLanguage: "ko",
  geniusId: "123456",
  geniusUrl: "https://genius.com/...",
  lyricsSource: "genius",
  // lyrics field is DELETED after analysis (copyright protection)
}
```

### Analysis Subcollection

```
/songs/{songId}/analysis/tokenization
{
  tokens: [
    { surface: "나", pos: "Noun", line: "나를 그냥 짓밟고 가" },
    { surface: "를", pos: "Josa", line: "나를 그냥 짓밟고 가" },
    ...
  ],
  processedAt: Timestamp
}

/songs/{songId}/analysis/vocabulary
{
  words: [
    {
      word: "짓밟다",
      pos: "Verb",
      count: 2,
      lines: ["나를 그냥 짓밟고 가", "..."]
    },
    ...
  ],
  processedAt: Timestamp
}

/songs/{songId}/analysis/grammar
{
  patterns: [
    {
      surface: "를",
      type: "Particle (case marker)",
      pos: "Josa",
      line: "나를 그냥 짓밟고 가"
    },
    ...
  ],
  processedAt: Timestamp
}

/songs/{songId}/analysis/pronunciation
{
  romanizations: [
    {
      original: "나를 그냥 짓밟고 가",
      romanization: "nareul geunyang jitbapgo ga"
    },
    ...
  ],
  processedAt: Timestamp
}

/songs/{songId}/analysis/error (only if analysis fails)
{
  error: "Error message",
  timestamp: Timestamp,
  retryable: true/false
}
```

---

## Performance & Cost

### Performance Metrics

**Cold Start (first request after idle):**
- Cloud Run container startup: ~10-15 seconds
- KoNLPy initialization: ~3-5 seconds
- Total: ~15-20 seconds

**Warm Request (container already running):**
- Analysis processing: ~5-10 seconds
- Firestore writes: ~1-2 seconds
- Total: ~7-12 seconds

**Typical Song (200-300 characters):**
- 300-400 tokens
- 150-200 vocabulary words
- 20-30 grammar patterns
- Processing time: ~10 seconds

### Cost Estimate

**Cloud Run:**
- Memory: 2Gi
- Execution time: ~10 seconds per song
- Cost per song: ~$0.001
- 1,000 songs/month: ~$1.00

**Firebase Functions:**
- Trigger is lightweight (< 1 second, 256MB)
- Cost per song: ~$0.0001
- 1,000 songs/month: ~$0.10

**Total: ~$1.10 per 1,000 songs analyzed**

**Scaling to zero:** No charges when idle (no songs being added)

---

## Monitoring & Debugging

### Check Cloud Run Logs

```bash
gcloud beta run services logs read analyze-lyrics \
  --project=lingoleap---staging \
  --region=us-central1 \
  --limit=50
```

### Check Firebase Function Logs

```bash
firebase functions:log --only analyzeLyricsTrigger \
  --project lingoleap---staging
```

### Check Service Status

```bash
# Cloud Run service URL
gcloud run services describe analyze-lyrics \
  --project=lingoleap---staging \
  --region=us-central1 \
  --format='value(status.url)'

# Health check
curl https://analyze-lyrics-mecb6iueja-uc.a.run.app/health
```

### Verify Firebase Config

```bash
firebase functions:config:get --project lingoleap---staging
# Should show: { "analyze_lyrics": { "cloud_run_url": "https://..." } }
```

---

## Troubleshooting

### Issue: "ANALYZE_LYRICS_CLOUD_RUN_URL environment variable not set"

**Cause:** Firebase Function can't find Cloud Run URL

**Fix:**
```bash
# Set the config
firebase functions:config:set \
  analyze_lyrics.cloud_run_url="https://analyze-lyrics-mecb6iueja-uc.a.run.app" \
  --project lingoleap---staging

# Redeploy trigger
firebase deploy --only functions:analyzeLyricsTrigger --project lingoleap---staging
```

### Issue: Out of memory (Cloud Run)

**Symptoms:** Container crashes, "137" exit code

**Fix:** Increase memory in `deploy-all.sh`:
```bash
--memory 4Gi  # Change from 2Gi
```

### Issue: Timeout (Cloud Run)

**Symptoms:** Request takes > 5 minutes

**Fix:** Increase timeout in `deploy-all.sh`:
```bash
--timeout 600s  # Change from 300s
```

### Issue: Analysis subcollection not appearing in Firestore

**Possible causes:**
1. Lyrics field missing in song document
2. Language is not "ko"
3. Song already analyzed (duplicate check)
4. Analysis failed (check error document)

**Debug:**
```bash
# Check Firebase logs
firebase functions:log --only analyzeLyricsTrigger | grep "song-ko-XXX"

# Check error document in Firestore
/songs/{songId}/analysis/error
```

---

## Security & Copyright

### Copyright Protection

**Problem:** Storing full lyrics may violate copyright

**Solution:** Delete lyrics after analysis
- Lyrics saved temporarily when song added
- Analysis runs (extracts tokens, vocabulary, grammar)
- Lyrics field deleted after analysis completes
- App fetches lyrics on-demand from Genius (licensed)

**Implementation:** `delete_lyrics()` function in `/functions/python-cloudrun/main.py`

```python
def delete_lyrics(song_id: str) -> None:
    """Delete lyrics field from song document (copyright protection)"""
    _get_db().collection('songs').document(song_id).update({
        'lyrics': firestore.DELETE_FIELD
    })
```

### Authentication

**Cloud Run:** `--allow-unauthenticated`
- Safe because Firebase Function is the only caller
- Firebase Function validates user ownership before calling
- Future: Add service account authentication for extra security

---

## Future Enhancements

### Phase 2A.1: Display Analysis Results (Next)

1. Read analysis data from Firestore
2. Display vocabulary with definitions
3. Clickable words in lyrics
4. Grammar pattern explanations

### Phase 2A.2: Dictionary Integration

1. Integrate Naver Dictionary API for Korean definitions
2. Add difficulty levels (beginner/intermediate/advanced)
3. Context-aware definitions using Claude API

### Phase 2A.3: Multi-language Support

1. Chinese: jieba tokenizer + CC-CEDICT dictionary
2. Japanese: MeCab tokenizer + JMDict dictionary
3. Spanish/French: spaCy + WordNet

### Phase 2B: Grammar & Syntax (Later)

1. Rule-based grammar pattern explanations
2. Syntax tree visualization
3. Example sentences for each pattern

---

## Deployment History

**2026-01-14:** Initial Cloud Run deployment
- Fixed Dockerfile (Java 17 → Java 21 for Debian Trixie compatibility)
- Fixed Firebase Function config access (`process.env` → `functions.config()`)
- Deployed successfully to production
- First Korean song analyzed: `song-ko-003`
  - 314 tokens
  - 177 vocabulary words
  - 24 grammar patterns

---

## References

- **Cloud Run Documentation:** https://cloud.google.com/run/docs
- **KoNLPy Documentation:** https://konlpy.org/en/latest/
- **Firebase Functions Config:** https://firebase.google.com/docs/functions/config-env
- **Revised Romanization of Korean:** https://en.wikipedia.org/wiki/Revised_Romanization_of_Korean
