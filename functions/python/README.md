# Python Cloud Functions - Korean Lyrics Analysis

**Purpose:** Analyze Korean song lyrics for vocabulary, grammar, and pronunciation.

**Status:** Phase 2A Implementation - Non-AI Pipeline

---

## Architecture

### Pipeline Overview

```
Song saved to /songs/{songId}
  ↓
Firestore onCreate trigger
  ↓
[analyzeLyrics Cloud Function]
  ↓
1. Tokenization (KoNLPy Okt) → ~1s
2. Vocabulary Extraction → ~2s
3. Grammar Analysis → ~2s
4. Pronunciation Generation → ~1s
  ↓
Results saved to /songs/{songId}/analysis
Total: ~6 seconds
```

---

## Files

### `main.py`
Entry point for the Cloud Function. Contains:
- `analyze_lyrics()`: Firestore trigger function
- Save functions for each analysis type
- Error handling and logging

### `tokenizer.py`
Korean tokenization using KoNLPy Okt.
- Splits lyrics into morphemes with POS tags
- Better for informal/casual text (song lyrics)
- Returns: List of tokens with morpheme, POS, line index

### `vocabulary.py`
Vocabulary extraction and analysis.
- Extracts unique words with base forms
- Assigns difficulty levels (beginner/intermediate/advanced)
- Calculates word frequency
- Returns: List of words with definitions and metadata

### `grammar.py`
Rule-based grammar pattern detection.
- Detects particles (조사): 을/를, 이/가, 은/는, etc.
- Detects verb endings (어미): -아/어, -았/었, etc.
- Detects connectors: -고, -지만, -면, etc.
- Returns: List of patterns with explanations and examples

### `pronunciation.py`
Korean romanization (Revised Romanization).
- Converts Hangul to Latin alphabet
- Line-by-line romanization
- Returns: Full romanization + line-by-line breakdown

---

## Requirements

### Python Dependencies

See `requirements.txt`:
- `functions-framework`: Firebase Functions runtime
- `firebase-admin`: Firestore access
- `konlpy`: Korean NLP library
- `JPype1`: Java bridge for KoNLPy
- `requests`: HTTP client

### System Requirements

- Python 3.11+
- Java Runtime (for KoNLPy)
- 1GB memory (for KoNLPy initialization)

---

## Development

### Local Testing

Test individual modules:

```bash
cd functions/python

# Test tokenizer
python tokenizer.py

# Test vocabulary
python vocabulary.py

# Test grammar
python grammar.py

# Test pronunciation
python pronunciation.py
```

### Install Dependencies Locally

```bash
cd functions/python
pip install -r requirements.txt
```

**Note:** KoNLPy requires Java. Install Java if not already installed:
```bash
# macOS
brew install openjdk

# Ubuntu
sudo apt-get install default-jdk
```

---

## Deployment

### Prerequisites

1. Firebase project set up
2. Python 3.11 runtime enabled
3. Billing enabled (Cloud Functions 2nd gen required)

### Deploy Command

```bash
# From project root
firebase deploy --only functions:analyze_lyrics
```

### Configuration

Update `firebase.json` to include Python function:

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs20"
    },
    {
      "source": "functions/python",
      "codebase": "python-functions",
      "runtime": "python311"
    }
  ]
}
```

---

## Output Schema

### Tokenization

```
/songs/{songId}/analysis/tokenization
{
  "tokens": [
    {
      "morpheme": "나",
      "pos": "pronoun",
      "posTag": "Pronoun",
      "lineIndex": 0,
      "charOffset": 0
    },
    ...
  ],
  "totalTokens": 150,
  "processedAt": Timestamp
}
```

### Vocabulary

```
/songs/{songId}/analysis/vocabulary
{
  "words": [
    {
      "word": "나",
      "variants": ["나를", "나의", "나는"],
      "pos": "pronoun",
      "definition": {
        "en": "I, me",
        "ko": "나 (first person pronoun)"
      },
      "level": "beginner",
      "frequency": 0.98,
      "count": 15,
      "lineIndices": [0, 2, 5, 8, 12]
    },
    ...
  ],
  "totalWords": 45,
  "processedAt": Timestamp
}
```

### Grammar

```
/songs/{songId}/analysis/grammar
{
  "patterns": [
    {
      "pattern": "를/을",
      "type": "particle",
      "explanation": "Object marker - marks the direct object of a verb",
      "example": "나를 사랑해 (Love me)",
      "level": "beginner",
      "lineIndices": [0, 3, 7]
    },
    ...
  ],
  "totalPatterns": 12,
  "processedAt": Timestamp
}
```

### Pronunciation

```
/songs/{songId}/analysis/pronunciation
{
  "fullRomanization": "nareul geunyang jitbapgo ga / gwaenchana doraboji ma",
  "lineByLine": [
    {
      "original": "나를 그냥 짓밟고 가",
      "romanization": "nareul geunyang jitbapgo ga"
    },
    ...
  ],
  "processedAt": Timestamp
}
```

---

## Limitations (Phase 2A)

### Current Limitations

1. **Dictionary:** Using hardcoded definitions for common words only
   - Future: Integrate Naver Dictionary API

2. **Verb Stemming:** Not implemented
   - Future: Proper verb/adjective stemming (가다 vs 가)

3. **Pronunciation Rules:** Basic romanization only
   - Future: Apply assimilation, palatalization, etc.

4. **AI Analysis:** Not included in Phase 2A
   - Future Phase 2B/C: Semantic, emotion, cultural analysis

### Supported Language

- **Korean (ko)** only
- Chinese, Japanese, etc. planned for future phases

---

## Troubleshooting

### KoNLPy Installation Issues

**Problem:** `JPype1` fails to install or KoNLPy can't find Java

**Solution:**
```bash
# Ensure Java is installed
java -version

# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home)

# Reinstall JPype1
pip install --upgrade JPype1
```

### Memory Issues

**Problem:** Cloud Function runs out of memory

**Solution:** Increase memory allocation in `main.py`:
```python
@firestore_fn.on_document_created(
    document="songs/{song_id}",
    memory=options.MemoryOption.MB_2GB  # Increase from 1GB
)
```

### Timeout Issues

**Problem:** Function times out before completing

**Solution:** Increase timeout in `main.py`:
```python
@firestore_fn.on_document_created(
    document="songs/{song_id}",
    timeout_sec=540  # Increase from 300 (max is 540)
)
```

---

## Future Enhancements (Phase 2B/2C)

### Dictionary Integration
- Integrate Naver Dictionary API for real definitions
- Fallback to multiple dictionary sources

### Verb Stemming
- Implement proper Korean verb/adjective stemming
- Handle irregular verbs

### Advanced Pronunciation
- Apply Korean pronunciation rules
- Generate IPA notation
- Text-to-speech audio generation

### AI Analysis
- Semantic analysis (literal vs figurative meaning)
- Emotion analysis (tone, formality, intent)
- Cultural context explanations

---

## Testing

### Unit Tests

```python
# Run all tests
python -m pytest

# Run specific module test
python tokenizer.py
python vocabulary.py
python grammar.py
python pronunciation.py
```

### Integration Test

1. Add a test song to Firestore `/songs/test-song-001`
2. Wait for `analyze_lyrics` to trigger (check logs)
3. Verify `/songs/test-song-001/analysis` subcollection has 4 documents

### Manual Test

```bash
# Check function logs
firebase functions:log --only analyze_lyrics

# Check Firestore data
firebase firestore:get songs/test-song-001/analysis/vocabulary
```

---

## Performance Metrics

### Expected Performance

- **Tokenization:** 1-2 seconds for 20-line song
- **Vocabulary:** 2-3 seconds for 50 unique words
- **Grammar:** 1-2 seconds for 15 patterns
- **Pronunciation:** 1 second for 20 lines
- **Total:** 5-8 seconds end-to-end

### Cost Estimates

- **Compute:** ~$0.0001 per analysis (1GB memory, 6 seconds)
- **Firestore Writes:** 4 documents per song = ~$0.000004
- **Total per song:** ~$0.0001

**For 1,000 songs:** ~$0.10

---

## Support

For issues or questions:
1. Check logs: `firebase functions:log`
2. Review Phase 2 planning docs in `/docs/features/learnmusic/`
3. Test modules individually with `python <module>.py`

---

**Last Updated:** 2026-01-13
**Status:** Ready for testing and deployment
