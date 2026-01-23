# Phase 2A.2: Enhanced Analysis Display - Requirements

**Last Updated:** 2026-01-23
**Status:** Planning
**Branch:** `feature/learn-music-phase2a2`

---

## Overview

Phase 2A.2 focuses on improving the quality and depth of Korean lyrics analysis data by:
1. Adding per-token romanization
2. Integrating real Korean-English dictionary definitions
3. Improving Korean definition accuracy
4. Standardizing grammar pattern explanations
5. Detecting verb tense and formality levels
6. Adding line-by-line English translations
7. Implementing audio pronunciation (optional)

### **Key Requirements:**

⭐ **Example Sentences are Critical:**
- **Vocabulary words:** Include 2-3 example sentences (from krdict API)
- **Grammar patterns:** Include 2-3 example sentences with breakdowns
- Examples help users understand context and usage

⭐ **Audio is Per-Token:**
- Generate audio for **individual vocabulary words** (not sentences/lines)
- User hears pronunciation when tapping word in TokenDetailBottomSheet
- Cache audio files by hash for reuse across songs

---

## Problem Statement

### Current Issues

1. **Romanization:** Only available per-line, not per-token
   - Users can't see pronunciation of individual words in vocabulary bottom sheet

2. **Vocabulary Definitions:** No English translations
   - Only Korean definitions (which learners may not understand)
   - Korean definitions are sometimes inaccurate/placeholder text

3. **Grammar Explanations:** Inconsistent format
   - Example good: "Object marker - marks the direct object of a verb"
   - Example bad: "Particle: 치고" (no explanation)
   - Missing tense and formality information

4. **No Line Translations:** Users can't see English meaning of each line
   - Harder to understand context and meaning

5. **No Audio:** Can't hear correct pronunciation
   - Important for language learning

---

## User Goals

As a language learner, I want to:

1. **See romanization for individual words** so I can learn pronunciation of vocabulary
2. **Get English translations of Korean words** so I can understand meaning without knowing Korean
3. **See accurate Korean definitions** from a real dictionary
4. **Understand grammar patterns clearly** with consistent explanations
5. **Know verb tense and formality** to understand context
6. **Read English translations of each line** to understand song meaning
7. **Hear correct pronunciation** of words and phrases

---

## Proposed Improvements

### 1. Per-Token Romanization ✅ HIGH PRIORITY

**What:** Add romanization field to each token

**Why:** Enables displaying pronunciation in vocabulary bottom sheet and individual word learning

**Implementation:**
```python
# tokenizer.py modification
def tokenize_lyrics(lyrics):
    tokens = []
    for token in okt.pos(lyrics, norm=True, stem=False):
        tokens.append({
            'morpheme': token[0],
            'posTag': token[1],
            'romanization': romanize_korean(token[0]),  # NEW FIELD
            # ... existing fields
        })
```

**Impact:**
- Low complexity (reuse existing romanization logic)
- High value (enables better vocabulary learning)

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/tokenization
{
  tokens: [
    {
      morpheme: "사랑",
      pos: "noun",
      posTag: "Noun",
      romanization: "sarang",  // NEW
      lineIndex: 0,
      charOffset: 5
    }
  ]
}
```

---

### 2. English Vocabulary Translations ✅ HIGH PRIORITY

**What:** Add English definitions to all vocabulary words using Korean-English dictionary API

**Why:** Most learners need English to understand Korean vocabulary

**IMPORTANT:** Include example sentences for vocabulary words to show usage in context

**API Options:**

| API | Pros | Cons | Cost | Recommendation |
|-----|------|------|------|----------------|
| **krdict** (Korean Learners' Dictionary) | Free, no API key, Python library, **example sentences included** | Limited coverage (~50K entries) | Free | ✅ **Start here** |
| **Naver Dictionary API** | Official, comprehensive, high quality, **example sentences** | Requires API key, rate limits | Free tier available | Backup option |
| **Korean-English WordNet** | Academic, open-source | Limited coverage, outdated, no examples | Free | Not recommended |

**Recommended Approach:** Use `krdict` Python library (includes example sentences)

**Implementation:**
```python
# vocabulary.py
from krdict import search_dict

def get_definition(word: str, pos: str) -> dict:
    """
    Fetch definition from Korean Learners' Dictionary

    Returns:
        {
            "en": "love; affection",
            "ko": "애정; 좋아하는 감정",
            "examples": [
                {"ko": "사랑을 고백하다", "en": "confess one's love"}
            ]
        }
    """
    try:
        results = search_dict(word)
        if results:
            return {
                "en": results[0].get('english_definition', ''),
                "ko": results[0].get('korean_definition', ''),
                "examples": results[0].get('examples', [])[:3]  # Limit to 3
            }
    except Exception as e:
        logger.warning(f"Dictionary lookup failed for {word}: {e}")
        return None

def extract_vocabulary(tokens, lyrics):
    # ... existing grouping logic ...

    for word, data in word_groups.items():
        definition = get_definition(word, data['pos'])  # NEW

        vocab_item = {
            'word': word,
            'pos': data['pos'],
            'count': data['count'],
            'lineIndices': data['lineIndices'],
            'definition': definition or {"en": "", "ko": ""},  # Fallback
            'examples': definition.get('examples', []) if definition else []  # NEW
        }
```

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/vocabulary
{
  vocabulary: [
    {
      word: "사랑",
      pos: "noun",
      count: 8,
      lineIndices: [0, 2, 5, 8],
      definition: {
        en: "love; affection",  // NEW
        ko: "애정; 좋아하는 감정"  // IMPROVED (from real dictionary)
      },
      examples: [  // NEW
        {
          ko: "사랑을 고백하다",
          en: "confess one's love"
        }
      ]
    }
  ]
}
```

**Dependencies:**
```txt
# requirements.txt
krdict==0.1.0
```

---

### 3. Improved Korean Definitions ✅ HIGH PRIORITY

**What:** Replace placeholder Korean definitions with real dictionary data

**Why:** Current Korean definitions are autogenerated and sometimes inaccurate

**Implementation:** Same API as #2 (krdict provides both Ko→En and Ko→Ko)

**No additional work needed** - handled by same dictionary API integration

---

### 4. Standardized Grammar Explanations ✅ HIGH PRIORITY

**What:** Create consistent format for all grammar pattern explanations

**Why:** Current explanations are inconsistent and sometimes unhelpful

**Current Issues:**
- ✅ Good: "Object marker - marks the direct object of a verb"
- ❌ Bad: "Particle: 치고" (just repeats the particle, no explanation)

**Proposed Standard Format:**

```python
# grammar.py - Grammar Pattern Library
GRAMMAR_PATTERNS = {
    "를/을": {
        "type": "particle",
        "category": "object_marker",
        "explanation": {
            "en": "Marks the direct object of a verb",
            "ko": "동사의 직접 목적어를 나타내는 조사"
        },
        "usage": "Use 을 after consonant-ending nouns, 를 after vowel-ending nouns",
        "level": "beginner",
        "examples": [  # IMPORTANT: Include 2-3 examples per pattern
            {
                "ko": "나를 사랑해",
                "en": "Love me",
                "romanization": "nareul saranghae",
                "breakdown": "나(I) + 를(object marker) + 사랑해(love)"
            },
            {
                "ko": "음악을 들어요",
                "en": "Listen to music",
                "romanization": "eumageul deureoyo",
                "breakdown": "음악(music) + 을(object marker) + 들어요(listen)"
            }
        ],
        "related_patterns": ["이/가", "은/는"]
    },

    "치고": {
        "type": "particle",
        "category": "considering",
        "explanation": {
            "en": "Considering; for (comparison particle)",
            "ko": "비교나 고려의 대상임을 나타내는 조사"
        },
        "usage": "Attach directly to noun to mean 'for/considering [noun]'",
        "level": "intermediate",
        "examples": [
            {
                "ko": "초보자치고 잘해요",
                "en": "You're good for a beginner",
                "romanization": "chobojachigo jalhaeyo",
                "breakdown": "초보자(beginner) + 치고(for/considering) + 잘해요(do well)"
            }
        ]
    },

    "아/어/해요": {
        "type": "verb_ending",
        "category": "present_tense_informal_polite",
        "tense": "present",  // NEW
        "formality": "informal_polite",  // NEW
        "explanation": {
            "en": "Present tense with informal polite speech level (-yo ending)",
            "ko": "현재 시제의 반말 존댓말 (요 어미)"
        },
        "formation": "Verb stem + 아/어/해요 (아 for ㅏ/ㅗ stems, 어 for others, 해 for 하다)",
        "level": "beginner",
        "examples": [
            {
                "ko": "가요",
                "en": "go (polite)",
                "romanization": "gayo",
                "breakdown": "가(go stem) + 아요(present polite)"
            },
            {
                "ko": "먹어요",
                "en": "eat (polite)",
                "romanization": "meogeoyo",
                "breakdown": "먹(eat stem) + 어요(present polite)"
            }
        ]
    }
}
```

**Refactor Detection Functions:**

```python
def detect_particles(tokens, tokens_by_line, lines):
    """Detect particle patterns with standardized format"""
    patterns = []

    for token in tokens:
        if token['posTag'] == 'Josa':  # Particle
            particle = token['morpheme']

            # Look up in pattern library
            if particle in GRAMMAR_PATTERNS:
                pattern_info = GRAMMAR_PATTERNS[particle]
                patterns.append({
                    'pattern': particle,
                    'type': pattern_info['type'],
                    'category': pattern_info['category'],
                    'explanation': pattern_info['explanation']['en'],
                    'explanation_ko': pattern_info['explanation']['ko'],
                    'usage': pattern_info['usage'],
                    'level': pattern_info['level'],
                    'examples': pattern_info['examples'],
                    'lineIndices': [token['lineIndex']]
                })
            else:
                # Fallback for unknown particles
                logger.warning(f"Unknown particle: {particle}")
                patterns.append({
                    'pattern': particle,
                    'type': 'particle',
                    'category': 'unknown',
                    'explanation': f"Particle: {particle} (definition pending)",
                    'level': 'unknown',
                    'lineIndices': [token['lineIndex']]
                })

    return patterns
```

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/grammar
{
  patterns: [
    {
      pattern: "를/을",
      type: "particle",
      category: "object_marker",  // NEW
      explanation: "Marks the direct object of a verb",
      explanation_ko: "동사의 직접 목적어를 나타내는 조사",  // NEW
      usage: "Use 을 after consonant, 를 after vowel",  // NEW
      level: "beginner",
      examples: [  // NEW - Multiple examples for better understanding
        {
          ko: "나를 사랑해",
          en: "Love me",
          romanization: "nareul saranghae",
          breakdown: "나(I) + 를(object marker) + 사랑해(love)"
        },
        {
          ko: "음악을 들어요",
          en: "Listen to music",
          romanization: "eumageul deureoyo",
          breakdown: "음악(music) + 을(object marker) + 들어요(listen)"
        },
        {
          ko: "책을 읽어요",
          en: "Read a book",
          romanization: "chaegeul ilgeoyo",
          breakdown: "책(book) + 을(object marker) + 읽어요(read)"
        }
      ],
      lineIndices: [0, 3, 7]
    }
  ]
}
```

**Note:** Grammar patterns should include **at least 2-3 example sentences** to demonstrate usage in different contexts.

---

### 5. Verb Tense & Formality Detection ✅ MEDIUM PRIORITY

**What:** Detect and label verb endings with tense and formality information

**Why:** Understanding tense and formality is crucial for Korean language learning

**Implementation:**

```python
# grammar.py - Verb Ending Patterns
VERB_ENDING_PATTERNS = {
    # Present Tense
    r"(아|어|해)요?$": {
        "tense": "present",
        "formality": "informal_polite",
        "pattern_name": "아/어/해요",
        "explanation": "Present tense, informal polite (-yo ending)"
    },
    r"ㅂ니다|습니다$": {
        "tense": "present",
        "formality": "formal",
        "pattern_name": "ㅂ/습니다",
        "explanation": "Present tense, formal speech"
    },
    r"(아|어|해)$": {
        "tense": "present",
        "formality": "casual",
        "pattern_name": "아/어/해 (반말)",
        "explanation": "Present tense, casual speech (banmal)"
    },

    # Past Tense
    r"(았|었|했)어요$": {
        "tense": "past",
        "formality": "informal_polite",
        "pattern_name": "았/었/했어요",
        "explanation": "Past tense, informal polite"
    },
    r"(았|었|했)습니다$": {
        "tense": "past",
        "formality": "formal",
        "pattern_name": "았/었/했습니다",
        "explanation": "Past tense, formal speech"
    },
    r"(았|었|했)어$": {
        "tense": "past",
        "formality": "casual",
        "pattern_name": "았/었/했어",
        "explanation": "Past tense, casual speech"
    },

    # Future Tense
    r"(ㄹ|을)\s?거예요$": {
        "tense": "future",
        "formality": "informal_polite",
        "pattern_name": "ㄹ/을 거예요",
        "explanation": "Future tense, informal polite"
    },
    r"(ㄹ|을)\s?것입니다$": {
        "tense": "future",
        "formality": "formal",
        "pattern_name": "ㄹ/을 것입니다",
        "explanation": "Future tense, formal speech"
    },
    r"(ㄹ|을)\s?거야$": {
        "tense": "future",
        "formality": "casual",
        "pattern_name": "ㄹ/을 거야",
        "explanation": "Future tense, casual speech"
    }
}

def detect_verb_endings(tokens, tokens_by_line, lines):
    """Enhanced verb ending detection with tense and formality"""
    patterns = []

    for token in tokens:
        if token['posTag'] in ['Verb', 'Adjective']:
            morpheme = token['morpheme']

            # Check against patterns
            for pattern_regex, metadata in VERB_ENDING_PATTERNS.items():
                if re.search(pattern_regex, morpheme):
                    patterns.append({
                        'pattern': metadata['pattern_name'],
                        'type': 'verb_ending',
                        'tense': metadata['tense'],  // NEW
                        'formality': metadata['formality'],  // NEW
                        'explanation': metadata['explanation'],
                        'example': morpheme,
                        'level': _determine_level(metadata['formality']),
                        'lineIndices': [token['lineIndex']]
                    })
                    break

    return patterns

def _determine_level(formality):
    """Map formality to learner level"""
    if formality == 'casual':
        return 'intermediate'  # Casual speech requires understanding relationship
    elif formality == 'informal_polite':
        return 'beginner'  # Most common, safest form
    elif formality == 'formal':
        return 'beginner'  # Common in formal settings
```

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/grammar
{
  patterns: [
    {
      pattern: "았/었/했어요",
      type: "verb_ending",
      tense: "past",  // NEW
      formality: "informal_polite",  // NEW
      explanation: "Past tense, informal polite speech",
      example: "사랑했어요",
      level: "beginner",
      lineIndices: [2, 5, 9]
    }
  ]
}
```

---

### 6. Line-by-Line Translation ✅ HIGH PRIORITY

**What:** Add English translation for each line of lyrics

**Why:** Helps learners understand the song's meaning and context

**API Options:**

| API | Pros | Cons | Cost | Recommendation |
|-----|------|------|------|----------------|
| **Papago (Naver)** | Best for Korean, understands context | Requires API key | 10,000 chars/day free | ✅ **Recommended** |
| **Google Cloud Translation** | Reliable, well-documented | Requires billing | $20 per 1M chars | Backup option |
| **OpenAI GPT** | Context-aware, poetic translations | Expensive, slow | ~$0.01 per line | For future enhancement |

**Recommended Approach:** Papago API (best Korean→English quality)

**Implementation:**

```python
# pronunciation.py
import requests
import os

PAPAGO_CLIENT_ID = os.getenv('PAPAGO_CLIENT_ID')
PAPAGO_CLIENT_SECRET = os.getenv('PAPAGO_CLIENT_SECRET')

def translate_line(korean_text: str) -> str:
    """
    Translate Korean text to English using Papago API

    Args:
        korean_text: Korean text to translate

    Returns:
        English translation
    """
    try:
        url = 'https://openapi.naver.com/v1/papago/n2mt'
        headers = {
            'X-Naver-Client-Id': PAPAGO_CLIENT_ID,
            'X-Naver-Client-Secret': PAPAGO_CLIENT_SECRET
        }
        data = {
            'source': 'ko',
            'target': 'en',
            'text': korean_text
        }

        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()

        result = response.json()
        return result['message']['result']['translatedText']

    except Exception as e:
        logger.error(f"Translation failed for '{korean_text}': {e}")
        return ""  # Return empty string on failure

def generate_pronunciation(lyrics: str) -> dict:
    """
    Generate romanization and translation for Korean lyrics

    Returns:
        {
            "fullRomanization": "nareul saranghae / gwaenchana",
            "lineByLine": [
                {
                    "original": "나를 사랑해",
                    "romanization": "nareul saranghae",
                    "translation": "Love me"  // NEW
                }
            ]
        }
    """
    logger.info("Starting pronunciation and translation generation")

    lines = lyrics.strip().split('\n')
    line_by_line = []
    full_romanization = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Romanize line
        romanized = romanize_korean(line)

        # Translate line
        translated = translate_line(line)  // NEW

        line_by_line.append({
            'original': line,
            'romanization': romanized,
            'translation': translated  // NEW
        })
        full_romanization.append(romanized)

    result = {
        'fullRomanization': ' / '.join(full_romanization),
        'lineByLine': line_by_line
    }

    logger.info(f"Processing complete: {len(line_by_line)} lines")
    return result
```

**Environment Variables:**
```bash
# .env (Cloud Run)
PAPAGO_CLIENT_ID=your_client_id
PAPAGO_CLIENT_SECRET=your_client_secret
```

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/pronunciation
{
  fullRomanization: "nareul saranghae / gwaenchana",
  lineByLine: [
    {
      original: "나를 사랑해",
      romanization: "nareul saranghae",
      translation: "Love me"  // NEW
    },
    {
      original: "괜찮아",
      romanization: "gwaenchana",
      translation: "It's okay"  // NEW
    }
  ]
}
```

**Dependencies:**
```txt
# requirements.txt
requests==2.31.0
```

**Rate Limiting:**
- Papago free tier: 10,000 characters/day
- Average song: ~500 characters
- ~20 songs/day within free tier
- Consider caching translations in Firestore

---

### 7. Audio Pronunciation ✅ MEDIUM PRIORITY (Optional)

**What:** Generate audio pronunciation **for each vocabulary token**

**Why:** Hearing correct pronunciation is essential for language learning

**IMPORTANT:** Audio should be generated per-token (individual words), not per-line, so users can hear pronunciation when tapping vocabulary words in the TokenDetailBottomSheet

**API Options:**

| API | Pros | Cons | Cost | Recommendation |
|-----|------|------|------|----------------|
| **Google Cloud TTS** | High quality, multiple voices, SSML support | Requires GCP setup | $4 per 1M chars | ✅ **Recommended** |
| **AWS Polly** | Good quality, Korean "Seoyeon" voice | Requires AWS setup | Similar to Google | Alternative |
| **gTTS** (Google TTS Free) | Free, easy to use | Robotic voice, limited quality | Free | MVP option |

**Recommended Approach:** Google Cloud Text-to-Speech

**Implementation:**

```python
# audio.py (NEW FILE)
import logging
import hashlib
from google.cloud import texttospeech
from google.cloud import storage

logger = logging.getLogger(__name__)

def generate_audio_for_token(korean_text: str, storage_bucket: str) -> str:
    """
    Generate audio pronunciation for Korean text using Google Cloud TTS

    Args:
        korean_text: Korean text to synthesize
        storage_bucket: Firebase Storage bucket name

    Returns:
        Public URL to MP3 file
    """
    try:
        # Initialize TTS client
        tts_client = texttospeech.TextToSpeechClient()

        # Configure synthesis
        synthesis_input = texttospeech.SynthesisInput(text=korean_text)

        # Select Korean voice (female, high quality)
        voice = texttospeech.VoiceSelectionParams(
            language_code="ko-KR",
            name="ko-KR-Wavenet-A",  # Female voice, natural
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )

        # Configure audio
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.9,  # Slightly slower for learners
            pitch=0.0
        )

        # Synthesize speech
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        # Generate unique filename
        text_hash = hashlib.md5(korean_text.encode()).hexdigest()
        filename = f"audio/ko/{text_hash}.mp3"

        # Upload to Firebase Storage
        storage_client = storage.Client()
        bucket = storage_client.bucket(storage_bucket)
        blob = bucket.blob(filename)

        blob.upload_from_string(
            response.audio_content,
            content_type='audio/mpeg'
        )

        # Make publicly accessible
        blob.make_public()

        public_url = blob.public_url
        logger.info(f"Generated audio for '{korean_text}': {public_url}")

        return public_url

    except Exception as e:
        logger.error(f"Audio generation failed for '{korean_text}': {e}")
        return ""  # Return empty on failure

def add_audio_to_vocabulary(vocabulary: list, storage_bucket: str) -> list:
    """
    Add audio URLs to vocabulary items

    Args:
        vocabulary: List of vocabulary items
        storage_bucket: Firebase Storage bucket

    Returns:
        Updated vocabulary list with audio URLs
    """
    for item in vocabulary:
        word = item['word']
        audio_url = generate_audio_for_token(word, storage_bucket)
        item['audioUrl'] = audio_url

    return vocabulary
```

**Update main.py:**
```python
# main.py
from audio import add_audio_to_vocabulary

@app.route('/analyze', methods=['POST'])
def analyze_lyrics():
    # ... existing code ...

    # Extract vocabulary
    vocabulary_data = extract_vocabulary(tokens, lyrics)

    # Add audio pronunciations (OPTIONAL - can be toggled)
    if os.getenv('ENABLE_AUDIO', 'false') == 'true':
        vocabulary_data = add_audio_to_vocabulary(
            vocabulary_data,
            os.getenv('STORAGE_BUCKET')
        )

    # ... rest of code ...
```

**Firestore Schema Change:**
```typescript
// /songs/{songId}/analysis/vocabulary
{
  vocabulary: [
    {
      word: "사랑",
      pos: "noun",
      romanization: "sarang",  // From improvement #1
      definition: {
        en: "love; affection",
        ko: "애정; 좋아하는 감정"
      },
      examples: [  // NEW - Example sentences from krdict
        {
          ko: "사랑을 고백하다",
          en: "confess one's love",
          romanization: "sarangeul gobaek-hada"
        },
        {
          ko: "첫사랑",
          en: "first love",
          romanization: "cheotsarang"
        }
      ],
      audioUrl: "https://storage.googleapis.com/.../audio/ko/abc123.mp3",  // NEW - Per-token audio
      count: 8,
      lineIndices: [0, 2, 5]
    }
  ]
}
```

**Note:**
- **Examples:** Include 2-3 example sentences for each vocabulary word (from krdict API)
- **Audio:** Generate audio for the individual word (not the examples), so users can hear "사랑" pronunciation when tapping the word

**Dependencies:**
```txt
# requirements.txt
google-cloud-texttospeech==2.14.1
google-cloud-storage==2.10.0
```

**Environment Variables:**
```bash
# .env
ENABLE_AUDIO=true
STORAGE_BUCKET=lingoleap---staging.appspot.com
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Cost Estimation:**
- Google Cloud TTS: $4 per 1M characters
- Average vocabulary word: 2 characters
- Average song: 50 unique vocabulary words = 100 characters
- Cost per song: ~$0.0004 (negligible)
- 1,000 songs: ~$0.40

**Caching Strategy:**
- Cache audio files by text hash (MD5)
- Reuse audio across songs (e.g., "사랑" audio used in all songs)
- Reduces cost and generation time

---

## Implementation Plan

### **Phase 2A.2.1: Core Data Quality** 🔜 DO FIRST

**Scope:**
1. Per-token romanization
2. English vocabulary translations (krdict)
3. Improved Korean definitions (krdict)
4. Standardized grammar explanations

**Estimated Effort:** 2-3 days

**Files to Modify:**
- `functions/python-cloudrun/tokenizer.py` - Add romanization to tokens
- `functions/python-cloudrun/vocabulary.py` - Integrate krdict API
- `functions/python-cloudrun/grammar.py` - Refactor with pattern library
- `functions/python-cloudrun/requirements.txt` - Add krdict

**Acceptance Criteria:**
- [ ] All tokens have romanization field
- [ ] All vocabulary words have English translations
- [ ] All vocabulary words have 2-3 example sentences showing usage
- [ ] Korean definitions come from real dictionary (krdict)
- [ ] All grammar patterns follow standardized format
- [ ] All grammar patterns have 2-3 example sentences with breakdowns
- [ ] No "Particle: X" explanations without context

---

### **Phase 2A.2.2: Enhanced Grammar** 🔜 DO SECOND

**Scope:**
5. Verb tense and formality detection

**Estimated Effort:** 1-2 days

**Files to Modify:**
- `functions/python-cloudrun/grammar.py` - Add tense/formality detection

**Acceptance Criteria:**
- [ ] Verb endings tagged with tense (past/present/future)
- [ ] Verb endings tagged with formality (casual/informal_polite/formal)
- [ ] Grammar patterns display tense and formality information

---

### **Phase 2A.2.3: Line Translations** 🔜 DO THIRD

**Scope:**
6. Line-by-line English translation (Papago API)

**Estimated Effort:** 1 day

**Files to Modify:**
- `functions/python-cloudrun/pronunciation.py` - Add translation
- `functions/python-cloudrun/requirements.txt` - Add requests
- Cloud Run environment variables - Add Papago credentials

**Prerequisites:**
- Sign up for Naver Developers account
- Get Papago API credentials (Client ID + Secret)

**Acceptance Criteria:**
- [ ] All lines have English translation
- [ ] Translations stored in pronunciation collection
- [ ] Graceful fallback if API fails
- [ ] Rate limiting handled properly

---

### **Phase 2A.2.4: Audio Pronunciation** ⏭️ OPTIONAL

**Scope:**
7. Audio pronunciation for vocabulary words

**Estimated Effort:** 2 days

**Files to Create:**
- `functions/python-cloudrun/audio.py` - TTS integration

**Files to Modify:**
- `functions/python-cloudrun/main.py` - Call audio generation
- `functions/python-cloudrun/requirements.txt` - Add google-cloud-texttospeech

**Prerequisites:**
- Enable Google Cloud Text-to-Speech API
- Configure service account permissions
- Enable Firebase Storage

**Acceptance Criteria:**
- [ ] Each vocabulary word has audio URL (per-token, not per-sentence)
- [ ] Audio files cached by hash (reused across songs)
- [ ] Audio playback button appears in TokenDetailBottomSheet
- [ ] Tapping audio button plays pronunciation of the word
- [ ] Graceful fallback if TTS fails (show message, don't block UI)

---

## Frontend Changes

### Components to Update

**1. TokenDetailBottomSheet.tsx**

Add display for new fields:
- Romanization (from token)
- English translation (from dictionary)
- **Example sentences section** (2-3 examples from krdict)
  - Show Korean + English + romanization for each example
  - Helps users understand word usage in context
- Audio playback button (plays pronunciation of the word, not examples)

**2. GrammarPatternBottomSheet.tsx**

Display enhanced grammar data:
- Tense and formality badges (e.g., "Past Tense • Informal Polite")
- Usage notes (formation rules)
- **Multiple example sentences** (2-3 examples with breakdowns)
  - Show Korean + English + romanization + breakdown
  - Breakdown explains each component (e.g., "나(I) + 를(object marker) + 사랑해(love)")

**3. TokenizedLyrics.tsx**

Display line translations:
- Show English translation below romanization
- Toggle visibility per line (like romanization)

---

## Security & Rate Limiting

### API Rate Limits

| API | Free Tier | Mitigation |
|-----|-----------|------------|
| krdict | No official limit | Cache in Firestore |
| Papago | 10,000 chars/day | Cache translations, ~20 songs/day |
| Google TTS | Pay-per-use | Cache by hash, enable only when needed |

### Caching Strategy

**Vocabulary Definitions:**
- Cache in Firestore by word+POS
- Create `/dictionary/{language}/words/{word}` collection
- Check cache before API call

**Line Translations:**
- Cache in pronunciation document (already stored)
- No additional storage needed

**Audio Files:**
- Cache in Firebase Storage by hash
- Reuse across all songs

---

## Testing Plan

### Unit Tests (Python)

```python
# test_vocabulary.py
def test_krdict_integration():
    definition = get_definition("사랑", "noun")
    assert definition['en'] != ""
    assert definition['ko'] != ""

def test_romanization_per_token():
    tokens = tokenize_lyrics("사랑해요")
    assert all('romanization' in token for token in tokens)

# test_grammar.py
def test_verb_tense_detection():
    patterns = detect_verb_endings([{'morpheme': '했어요', 'posTag': 'Verb'}])
    assert patterns[0]['tense'] == 'past'
    assert patterns[0]['formality'] == 'informal_polite'

# test_translation.py
def test_papago_translation():
    translation = translate_line("나를 사랑해")
    assert translation.lower() == "love me"
```

### Integration Tests

1. **Full Analysis Pipeline:**
   - Submit lyrics with all improvements enabled
   - Verify all fields populated correctly
   - Check Firestore documents have correct schema

2. **API Failure Handling:**
   - Test with invalid Papago credentials
   - Verify graceful degradation (empty strings, not crashes)

3. **Performance:**
   - Measure analysis time with all features enabled
   - Target: < 10 seconds for average song

---

## Deployment Checklist

### Prerequisites

- [ ] Sign up for Naver Developers account (for Papago)
- [ ] Get Papago API credentials
- [ ] Enable Google Cloud TTS API (if doing audio)
- [ ] Configure service account permissions

### Environment Variables

```bash
# Cloud Run .env
PAPAGO_CLIENT_ID=your_papago_client_id
PAPAGO_CLIENT_SECRET=your_papago_secret

# Optional (for audio)
ENABLE_AUDIO=true
STORAGE_BUCKET=lingoleap---staging.appspot.com
```

### Deployment Steps

```bash
# 1. Update requirements.txt
cd functions/python-cloudrun
pip install -r requirements.txt

# 2. Test locally
python main.py

# 3. Deploy to Cloud Run
gcloud run deploy korean-analysis \
  --source . \
  --region us-central1 \
  --set-env-vars PAPAGO_CLIENT_ID=xxx,PAPAGO_CLIENT_SECRET=xxx

# 4. Verify deployment
curl -X POST https://korean-analysis-xxx.run.app/analyze \
  -H "Content-Type: application/json" \
  -d '{"songId": "test", "lyrics": "사랑해요"}'
```

---

## Success Metrics

### Data Quality Metrics

- **Vocabulary Coverage:** 100% of words have English translations
- **Grammar Explanation Quality:** 0 "Particle: X" explanations
- **Translation Accuracy:** Spot-check 20 songs, >90% accurate
- **Audio Generation:** >95% success rate

### User Experience Metrics

- **Vocabulary Bottom Sheet:** All fields populated (romanization, definitions, examples)
- **Grammar Bottom Sheet:** Clear, consistent explanations with tense/formality
- **Lyrics Display:** English translation helps comprehension
- **Audio Playback:** Works on first try, <2s load time

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| krdict coverage gaps | Some words missing definitions | Fallback to placeholder, add manual definitions |
| Papago rate limits | Can't translate all songs | Cache aggressively, 20 songs/day reasonable |
| Translation quality | Inaccurate English | Spot-check, allow user feedback |
| TTS cost | Unexpected high costs | Cache by hash, make optional, monitor usage |
| API downtime | Analysis fails | Graceful degradation, retry logic |

---

## Future Enhancements (Post-2A.2)

### Phase 2A.3 (Future)
- User-submitted corrections for definitions
- Context-aware translations (using GPT for poetic accuracy)
- Pronunciation difficulty ratings
- Pitch accent notation (for advanced learners)

### Phase 2B (Grammar Lessons)
- Link from grammar patterns to full lesson screens
- Interactive exercises for each pattern
- Grammar progression tracking

### Phase 2C (Flashcards)
- Auto-generate flashcards from vocabulary
- Include audio on flashcards
- Spaced repetition system

---

## References

### APIs & Libraries

- **krdict:** https://github.com/korean-dict/krdict-py
- **Papago API:** https://developers.naver.com/docs/papago/README.md
- **Google Cloud TTS:** https://cloud.google.com/text-to-speech/docs
- **KoNLPy:** https://konlpy.org/en/latest/

### Korean Language Resources

- **Revised Romanization:** https://en.wikipedia.org/wiki/Revised_Romanization_of_Korean
- **Speech Levels:** https://en.wikipedia.org/wiki/Korean_speech_levels
- **Verb Conjugation:** https://www.howtostudykorean.com/unit1/unit-1-lessons-1-8/lesson-5/

---

**Last Updated:** 2026-01-23
**Document Owner:** Development Team
**Next Review:** After Phase 2A.2.1 completion
