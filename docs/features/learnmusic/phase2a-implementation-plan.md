# Phase 2A: Non-AI Analysis Pipeline - Implementation Plan

**Date:** 2026-01-13
**Scope:** Tokenization + Vocabulary + Grammar + Pronunciation (NO AI)
**Timeline:** 4-6 weeks

---

## TL;DR: Build Foundation First, Add AI Later

**Pipeline Steps:**
1. ✅ Tokenization (KoNLPy Okt)
2. ✅ Vocabulary Extraction (Dictionary APIs + frequency data)
3. ✅ Grammar/Syntax Analysis (Rule-based pattern matching)
4. ✅ Pronunciation Generation (Romanization library)
5. ❌ AI Semantic/Emotion Analysis (Phase 2B - later)

**Architecture:** New Firebase Function `analyzeLyrics` with Firestore trigger

---

## Pipeline Architecture

### Flow

```
Song saved to /songs/{songId}
  ↓
Firestore onCreate trigger
  ↓
[analyzeLyrics Cloud Function starts]
  ↓
Step 1: Tokenization (KoNLPy Okt)
  Input: "나를 그냥 짓밟고 가"
  Output: [
    {morpheme: "나", pos: "NP"},
    {morpheme: "를", pos: "JKO"},
    {morpheme: "그냥", pos: "MAG"},
    {morpheme: "짓밟", pos: "VV"},
    {morpheme: "고", pos: "EC"},
    {morpheme: "가", pos: "VV"}
  ]
  Save to: /songs/{songId}/analysis/tokenization
  Duration: ~1s
  ↓
Step 2: Vocabulary Extraction
  Input: Tokens from Step 1
  Output: [
    {
      word: "나를",
      baseForm: "나",
      pos: "pronoun+particle",
      definition: "me (object marker)",
      level: "beginner",
      frequency: 0.95
    },
    ...
  ]
  Save to: /songs/{songId}/analysis/vocabulary
  Duration: ~2s
  ↓
Step 3: Grammar Analysis
  Input: Tokens from Step 1
  Output: [
    {
      pattern: "를/을",
      type: "particle",
      explanation: "Object marker - marks direct object",
      example: "나를 사랑해 (Love me)",
      level: "beginner"
    },
    ...
  ]
  Save to: /songs/{songId}/analysis/grammar
  Duration: ~2s
  ↓
Step 4: Pronunciation
  Input: Original lyrics
  Output: {
    romanization: "nareul geunyang jitbapgo ga",
    lineByLine: [
      {line: "나를 그냥 짓밟고 가", romanization: "nareul geunyang jitbapgo ga"}
    ]
  }
  Save to: /songs/{songId}/analysis/pronunciation
  Duration: ~1s
  ↓
[Total: ~6 seconds for full non-AI analysis]
```

---

## Technology Stack

### Cloud Functions Setup

**Challenge:** KoNLPy is Python, but Firebase Functions is Node.js (TypeScript)

**Solutions:**

#### Option A: Python Cloud Functions (Recommended)
- Use Firebase's 2nd gen Cloud Functions (Python support)
- Write entire `analyzeLyrics` function in Python
- Direct access to KoNLPy, no subprocess needed

**Pros:**
- ✅ Native Python support
- ✅ Direct KoNLPy access
- ✅ Better performance (no subprocess overhead)
- ✅ Easier debugging

**Cons:**
- ⚠️ Requires migrating to 2nd gen functions
- ⚠️ Different deployment process

#### Option B: Node.js + Python Subprocess
- Keep `analyzeLyrics` in TypeScript
- Call Python script as subprocess
- Python script does KoNLPy work, returns JSON

**Pros:**
- ✅ Keep existing Node.js setup
- ✅ No migration needed

**Cons:**
- ❌ Slower (subprocess overhead)
- ❌ More complex error handling
- ❌ Harder to debug

#### Option C: External Python Service
- Deploy separate Python service (Cloud Run, AWS Lambda)
- Call from TypeScript Cloud Function

**Pros:**
- ✅ Fully isolated
- ✅ Can scale independently

**Cons:**
- ❌ More infrastructure complexity
- ❌ Additional deployment

**Recommendation:** **Option A - Python Cloud Functions (2nd gen)**

---

## Implementation: Python Cloud Function

### File Structure

```
functions/
├── package.json (existing Node.js functions)
├── tsconfig.json
├── src/
│   ├── index.ts (existing functions)
│   ├── searchSongs.ts
│   ├── fetchLyrics.ts
│   └── ...
└── python/
    ├── requirements.txt
    ├── main.py (analyzeLyrics entry point)
    ├── tokenizer.py
    ├── vocabulary.py
    ├── grammar.py
    └── pronunciation.py
```

### requirements.txt

```txt
# KoNLPy for Korean tokenization
konlpy==0.6.0

# Java dependencies for KoNLPy
JPype1==1.4.1

# Firebase Admin SDK
firebase-admin==6.2.0

# Korean dictionary (if available)
# korean-dict==0.1.0  # May not exist, build custom

# Romanization
hangul-romanize==0.1.0  # Check if this exists

# HTTP client (for dictionary APIs)
requests==2.31.0
```

### main.py (Entry Point)

```python
"""
analyzeLyrics Cloud Function
Analyzes Korean song lyrics for vocabulary, grammar, and pronunciation
"""

import json
import logging
from typing import Dict, Any
from firebase_admin import initialize_app, firestore
from firebase_functions import firestore_fn, options

# Initialize Firebase
initialize_app()
db = firestore.client()

# Import analysis modules
from tokenizer import tokenize_korean
from vocabulary import extract_vocabulary
from grammar import analyze_grammar
from pronunciation import generate_pronunciation

@firestore_fn.on_document_created(
    document="songs/{song_id}",
    timeout_sec=300,  # 5 minutes max
    memory=options.MemoryOption.MB_512
)
def analyze_lyrics(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Triggered when a new song is created in /songs/{songId}
    Analyzes lyrics and saves results to /songs/{songId}/analysis
    """
    song_id = event.params["song_id"]
    song_data = event.data.to_dict()

    logging.info(f"🎵 Starting analysis for song {song_id}")

    # Check if already analyzed
    analysis_ref = db.collection('songs').document(song_id).collection('analysis').document('vocabulary')
    if analysis_ref.get().exists:
        logging.info(f"Song {song_id} already analyzed, skipping")
        return

    # Extract data
    lyrics = song_data.get('lyrics', '')
    language = song_data.get('language', 'ko')

    if not lyrics:
        logging.error(f"No lyrics found for song {song_id}")
        return

    if language != 'ko':
        logging.warning(f"Song {song_id} is not Korean (language: {language}), skipping")
        return

    try:
        # Step 1: Tokenization
        logging.info(f"[1/4] Tokenizing lyrics...")
        tokens = tokenize_korean(lyrics)
        save_tokenization(song_id, tokens)
        logging.info(f"✅ Tokenization complete: {len(tokens)} tokens")

        # Step 2: Vocabulary Extraction
        logging.info(f"[2/4] Extracting vocabulary...")
        vocabulary = extract_vocabulary(tokens, lyrics)
        save_vocabulary(song_id, vocabulary)
        logging.info(f"✅ Vocabulary complete: {len(vocabulary)} unique words")

        # Step 3: Grammar Analysis
        logging.info(f"[3/4] Analyzing grammar...")
        grammar = analyze_grammar(tokens, lyrics)
        save_grammar(song_id, grammar)
        logging.info(f"✅ Grammar complete: {len(grammar)} patterns")

        # Step 4: Pronunciation
        logging.info(f"[4/4] Generating pronunciation...")
        pronunciation = generate_pronunciation(lyrics)
        save_pronunciation(song_id, pronunciation)
        logging.info(f"✅ Pronunciation complete")

        logging.info(f"🎉 Analysis complete for song {song_id}")

    except Exception as e:
        logging.error(f"❌ Analysis failed for song {song_id}: {str(e)}")
        # Save error state
        db.collection('songs').document(song_id).collection('analysis').document('error').set({
            'error': str(e),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'retryable': True
        })
        raise


def save_tokenization(song_id: str, tokens: list) -> None:
    """Save tokenization results to Firestore"""
    db.collection('songs').document(song_id).collection('analysis').document('tokenization').set({
        'tokens': tokens,
        'processedAt': firestore.SERVER_TIMESTAMP
    })


def save_vocabulary(song_id: str, vocabulary: list) -> None:
    """Save vocabulary to Firestore"""
    db.collection('songs').document(song_id).collection('analysis').document('vocabulary').set({
        'words': vocabulary,
        'processedAt': firestore.SERVER_TIMESTAMP
    })


def save_grammar(song_id: str, grammar: list) -> None:
    """Save grammar patterns to Firestore"""
    db.collection('songs').document(song_id).collection('analysis').document('grammar').set({
        'patterns': grammar,
        'processedAt': firestore.SERVER_TIMESTAMP
    })


def save_pronunciation(song_id: str, pronunciation: dict) -> None:
    """Save pronunciation to Firestore"""
    db.collection('songs').document(song_id).collection('analysis').document('pronunciation').set({
        **pronunciation,
        'processedAt': firestore.SERVER_TIMESTAMP
    })
```

### tokenizer.py

```python
"""
Korean Tokenization using KoNLPy
"""

from konlpy.tag import Okt
import logging

# Initialize tokenizer (global to reuse across invocations)
okt = Okt()

def tokenize_korean(lyrics: str) -> list:
    """
    Tokenize Korean lyrics into morphemes with POS tags

    Args:
        lyrics: Korean lyrics text

    Returns:
        List of tokens with morpheme and POS tag
        Example: [
            {"morpheme": "나", "pos": "Pronoun", "index": 0},
            {"morpheme": "를", "pos": "Josa", "index": 1},
            ...
        ]
    """
    try:
        # Split lyrics into lines
        lines = lyrics.strip().split('\n')

        all_tokens = []
        char_offset = 0

        for line_idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                char_offset += 1  # for newline
                continue

            # Tokenize with POS tags
            # pos() returns list of tuples: [("나", "Pronoun"), ("를", "Josa"), ...]
            morphs = okt.pos(line, stem=False, norm=False)

            # Convert to structured format
            for morph, pos in morphs:
                token = {
                    'morpheme': morph,
                    'pos': map_pos_to_readable(pos),
                    'posTag': pos,  # Original tag for grammar analysis
                    'lineIndex': line_idx,
                    'charOffset': char_offset
                }
                all_tokens.append(token)
                char_offset += len(morph)

            char_offset += 1  # for newline

        logging.info(f"Tokenized {len(lines)} lines into {len(all_tokens)} tokens")
        return all_tokens

    except Exception as e:
        logging.error(f"Tokenization error: {str(e)}")
        raise


def map_pos_to_readable(pos_tag: str) -> str:
    """
    Map KoNLPy POS tags to human-readable names

    KoNLPy (Okt) POS tags:
    - Noun: 명사
    - Verb: 동사
    - Adjective: 형용사
    - Adverb: 부사
    - Josa: 조사 (particle)
    - Eomi: 어미 (verb ending)
    - etc.
    """
    pos_map = {
        'Noun': 'noun',
        'Verb': 'verb',
        'Adjective': 'adjective',
        'Adverb': 'adverb',
        'Josa': 'particle',
        'Eomi': 'ending',
        'Pronoun': 'pronoun',
        'Determiner': 'determiner',
        'Number': 'number',
        'Punctuation': 'punctuation',
        'Foreign': 'foreign',
        'Alpha': 'alphabet',
        'Unknown': 'unknown'
    }
    return pos_map.get(pos_tag, pos_tag.lower())
```

### vocabulary.py

```python
"""
Vocabulary Extraction
Extracts unique words with definitions and metadata
"""

import logging
from collections import Counter
from typing import List, Dict

def extract_vocabulary(tokens: list, lyrics: str) -> list:
    """
    Extract vocabulary from tokenized lyrics

    Args:
        tokens: List of tokens from tokenizer
        lyrics: Original lyrics text (for context)

    Returns:
        List of vocabulary items with definitions and metadata
    """
    # Group tokens by base form
    word_groups = {}

    for token in tokens:
        morpheme = token['morpheme']
        pos = token['posTag']

        # Skip punctuation
        if pos == 'Punctuation':
            continue

        # Get base form (for now, just use morpheme - can enhance with stemming later)
        base_form = get_base_form(morpheme, pos)

        if base_form not in word_groups:
            word_groups[base_form] = {
                'baseForm': base_form,
                'variants': [],
                'pos': token['pos'],
                'posTag': pos,
                'occurrences': [],
                'count': 0
            }

        # Track variant if different from base
        if morpheme != base_form and morpheme not in word_groups[base_form]['variants']:
            word_groups[base_form]['variants'].append(morpheme)

        # Track occurrence
        word_groups[base_form]['occurrences'].append({
            'morpheme': morpheme,
            'lineIndex': token['lineIndex']
        })
        word_groups[base_form]['count'] += 1

    # Convert to vocabulary list
    vocabulary = []

    for base_form, data in word_groups.items():
        # Get definition (placeholder - will implement dictionary lookup)
        definition = get_definition(base_form, data['posTag'])

        # Determine difficulty level
        level = determine_difficulty_level(base_form, data['posTag'], data['count'])

        # Calculate frequency (0-1 scale, how common this word is in Korean)
        frequency = get_word_frequency(base_form)

        vocab_item = {
            'word': base_form,
            'variants': data['variants'],
            'pos': data['pos'],
            'definition': definition,
            'level': level,
            'frequency': frequency,
            'count': data['count'],
            'lineIndices': list(set([occ['lineIndex'] for occ in data['occurrences']]))
        }

        vocabulary.append(vocab_item)

    # Sort by frequency (most common words first)
    vocabulary.sort(key=lambda x: x['count'], reverse=True)

    logging.info(f"Extracted {len(vocabulary)} unique vocabulary items")
    return vocabulary


def get_base_form(morpheme: str, pos: str) -> str:
    """
    Get base form of a word
    For now, just return morpheme (can enhance with stemming later)
    """
    # TODO: Implement verb/adjective stemming
    # e.g., "가다" (to go) vs "가" (go - imperative)
    return morpheme


def get_definition(word: str, pos: str) -> Dict[str, str]:
    """
    Get word definition from dictionary

    TODO: Integrate with Naver Dictionary API or local dictionary
    For now, return placeholder
    """
    # Placeholder - will implement dictionary API integration
    return {
        'en': f'[Definition needed for {word}]',
        'ko': f'[{word}의 뜻]'
    }


def determine_difficulty_level(word: str, pos: str, count: int) -> str:
    """
    Determine difficulty level: beginner, intermediate, advanced

    Based on:
    - Word frequency in Korean language
    - POS (pronouns/particles are usually beginner)
    - Word length/complexity
    """
    # TODO: Use proper frequency dictionary (e.g., Korean frequency list)

    # Basic heuristics for now
    beginner_words = ['나', '너', '이', '그', '저', '을', '를', '이', '가', '은', '는', '의', '도', '만']

    if word in beginner_words:
        return 'beginner'

    # Pronouns and particles are usually beginner
    if pos in ['Pronoun', 'Josa']:
        return 'beginner'

    # Common verbs/adjectives might be intermediate
    if pos in ['Verb', 'Adjective'] and len(word) <= 2:
        return 'intermediate'

    # Default to intermediate
    return 'intermediate'


def get_word_frequency(word: str) -> float:
    """
    Get word frequency (0-1 scale)
    1.0 = extremely common (e.g., 이, 가)
    0.0 = very rare

    TODO: Use proper Korean frequency dictionary
    """
    # Placeholder
    return 0.5
```

### grammar.py

```python
"""
Grammar Pattern Analysis
Rule-based detection of Korean grammar patterns
"""

import logging
from typing import List, Dict

def analyze_grammar(tokens: list, lyrics: str) -> list:
    """
    Analyze grammar patterns in tokenized lyrics

    Args:
        tokens: List of tokens from tokenizer
        lyrics: Original lyrics text

    Returns:
        List of grammar patterns found
    """
    patterns = []

    # Split into lines for line-by-line analysis
    lines = lyrics.strip().split('\n')
    tokens_by_line = group_tokens_by_line(tokens)

    for line_idx, line_tokens in tokens_by_line.items():
        line = lines[line_idx] if line_idx < len(lines) else ''

        # Detect particles (조사)
        particle_patterns = detect_particles(line_tokens, line)
        patterns.extend(particle_patterns)

        # Detect verb endings (어미)
        ending_patterns = detect_verb_endings(line_tokens, line)
        patterns.extend(ending_patterns)

        # Detect connectors (-고, -면, -지만, etc.)
        connector_patterns = detect_connectors(line_tokens, line)
        patterns.extend(connector_patterns)

    # Remove duplicates
    unique_patterns = deduplicate_patterns(patterns)

    logging.info(f"Found {len(unique_patterns)} unique grammar patterns")
    return unique_patterns


def group_tokens_by_line(tokens: list) -> Dict[int, list]:
    """Group tokens by line index"""
    by_line = {}
    for token in tokens:
        line_idx = token['lineIndex']
        if line_idx not in by_line:
            by_line[line_idx] = []
        by_line[line_idx].append(token)
    return by_line


def detect_particles(tokens: list, line: str) -> list:
    """
    Detect Korean particles (조사)
    Common particles: 을/를, 이/가, 은/는, 의, 에, 에서, 도, 만, etc.
    """
    patterns = []

    for i, token in enumerate(tokens):
        if token['posTag'] != 'Josa':
            continue

        particle = token['morpheme']
        pattern = get_particle_pattern(particle, tokens, i, line)

        if pattern:
            patterns.append(pattern)

    return patterns


def get_particle_pattern(particle: str, tokens: list, index: int, line: str) -> Dict:
    """Get explanation for a specific particle"""

    # Common particles and their explanations
    particle_info = {
        '을': {
            'pattern': '을/를',
            'type': 'particle',
            'explanation': 'Object marker - marks the direct object of a verb',
            'example': '나를 사랑해 (Love me)',
            'level': 'beginner'
        },
        '를': {
            'pattern': '을/를',
            'type': 'particle',
            'explanation': 'Object marker - marks the direct object of a verb',
            'example': '나를 사랑해 (Love me)',
            'level': 'beginner'
        },
        '이': {
            'pattern': '이/가',
            'type': 'particle',
            'explanation': 'Subject marker - marks the subject of a sentence',
            'example': '나이 좋아 (I like it)',
            'level': 'beginner'
        },
        '가': {
            'pattern': '이/가',
            'type': 'particle',
            'explanation': 'Subject marker - marks the subject of a sentence',
            'example': '비가 와 (It rains)',
            'level': 'beginner'
        },
        '은': {
            'pattern': '은/는',
            'type': 'particle',
            'explanation': 'Topic marker - indicates the topic of the sentence',
            'example': '나는 학생이야 (I am a student)',
            'level': 'beginner'
        },
        '는': {
            'pattern': '은/는',
            'type': 'particle',
            'explanation': 'Topic marker - indicates the topic of the sentence',
            'example': '나는 학생이야 (I am a student)',
            'level': 'beginner'
        },
        '의': {
            'pattern': '의',
            'type': 'particle',
            'explanation': 'Possessive particle - indicates possession or relation',
            'example': '나의 친구 (my friend)',
            'level': 'beginner'
        },
        '에': {
            'pattern': '에',
            'type': 'particle',
            'explanation': 'Location/time particle - indicates location or time',
            'example': '학교에 가다 (go to school)',
            'level': 'beginner'
        },
        '도': {
            'pattern': '도',
            'type': 'particle',
            'explanation': 'Also/too particle - means "also" or "too"',
            'example': '나도 좋아 (I like it too)',
            'level': 'beginner'
        }
    }

    info = particle_info.get(particle)
    if not info:
        # Unknown particle - create basic pattern
        return {
            'pattern': particle,
            'type': 'particle',
            'explanation': f'Particle: {particle}',
            'example': '',
            'level': 'intermediate',
            'lineIndex': tokens[index]['lineIndex']
        }

    return {
        **info,
        'lineIndex': tokens[index]['lineIndex']
    }


def detect_verb_endings(tokens: list, line: str) -> list:
    """
    Detect verb endings (어미)
    Common endings: -아/어, -았/었, -ㄹ/을, etc.
    """
    patterns = []

    for i, token in enumerate(tokens):
        if token['posTag'] != 'Eomi':
            continue

        ending = token['morpheme']
        pattern = get_ending_pattern(ending, tokens, i, line)

        if pattern:
            patterns.append(pattern)

    return patterns


def get_ending_pattern(ending: str, tokens: list, index: int, line: str) -> Dict:
    """Get explanation for verb ending"""
    # Placeholder - will implement comprehensive ending patterns
    return {
        'pattern': ending,
        'type': 'ending',
        'explanation': f'Verb ending: {ending}',
        'example': '',
        'level': 'intermediate',
        'lineIndex': tokens[index]['lineIndex']
    }


def detect_connectors(tokens: list, line: str) -> list:
    """
    Detect connectors (-고, -지만, -면, etc.)
    """
    patterns = []

    connector_endings = ['고', '지만', '면', '어서', '아서', '니까']

    for i, token in enumerate(tokens):
        if token['morpheme'] in connector_endings:
            pattern = get_connector_pattern(token['morpheme'], tokens, i, line)
            patterns.append(pattern)

    return patterns


def get_connector_pattern(connector: str, tokens: list, index: int, line: str) -> Dict:
    """Get explanation for connector"""
    connector_info = {
        '고': {
            'pattern': '-고',
            'type': 'connector',
            'explanation': 'Sequential connector - links two actions ("and then")',
            'example': '먹고 자다 (eat and sleep)',
            'level': 'beginner'
        },
        '지만': {
            'pattern': '-지만',
            'type': 'connector',
            'explanation': 'Contrast connector - means "but" or "although"',
            'example': '좋지만 비싸 (Good but expensive)',
            'level': 'intermediate'
        }
    }

    info = connector_info.get(connector, {
        'pattern': f'-{connector}',
        'type': 'connector',
        'explanation': f'Connector: {connector}',
        'example': '',
        'level': 'intermediate'
    })

    return {
        **info,
        'lineIndex': tokens[index]['lineIndex']
    }


def deduplicate_patterns(patterns: list) -> list:
    """Remove duplicate patterns (keep first occurrence)"""
    seen = set()
    unique = []

    for pattern in patterns:
        key = pattern['pattern']
        if key not in seen:
            seen.add(key)
            unique.append(pattern)

    return unique
```

### pronunciation.py

```python
"""
Pronunciation Generation
Romanization of Korean text
"""

import logging
import re

def generate_pronunciation(lyrics: str) -> dict:
    """
    Generate romanization for Korean lyrics

    Args:
        lyrics: Korean lyrics text

    Returns:
        Dict with romanization data
    """
    lines = lyrics.strip().split('\n')

    line_by_line = []
    full_romanization = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Romanize line
        romanized = romanize_korean(line)

        line_by_line.append({
            'original': line,
            'romanization': romanized
        })
        full_romanization.append(romanized)

    return {
        'fullRomanization': ' / '.join(full_romanization),
        'lineByLine': line_by_line
    }


def romanize_korean(text: str) -> str:
    """
    Romanize Korean text using Revised Romanization

    TODO: Use proper romanization library (hangul-romanize or similar)
    For now, implement basic romanization
    """
    # Placeholder - will implement proper romanization
    # This is a simplified version

    # For now, return placeholder
    # In real implementation, use proper library
    return f"[Romanization: {text}]"
```

---

## Deployment

### Deploy Python Cloud Function

```bash
# Navigate to python directory
cd functions/python

# Deploy function
firebase deploy --only functions:analyze_lyrics
```

### firebase.json Configuration

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log"]
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

## Testing Strategy

### Unit Tests

```python
# functions/python/test_tokenizer.py
import unittest
from tokenizer import tokenize_korean

class TestTokenizer(unittest.TestCase):
    def test_basic_tokenization(self):
        lyrics = "나를 그냥 짓밟고 가"
        tokens = tokenize_korean(lyrics)

        self.assertGreater(len(tokens), 0)
        self.assertEqual(tokens[0]['morpheme'], '나')
        self.assertEqual(tokens[0]['pos'], 'pronoun')
```

### Integration Test

1. Add test song to Firestore
2. Wait for `analyzeLyrics` to trigger
3. Check `/songs/{songId}/analysis` for results
4. Verify all 4 documents exist (tokenization, vocabulary, grammar, pronunciation)

---

## Next Steps

1. ✅ Review this implementation plan
2. Set up Python Cloud Functions environment
3. Implement tokenizer.py
4. Implement vocabulary.py (with dictionary API)
5. Implement grammar.py
6. Implement pronunciation.py (with proper romanization library)
7. Deploy and test
8. Update LyricsScreen to display analysis

Ready to start implementing?
