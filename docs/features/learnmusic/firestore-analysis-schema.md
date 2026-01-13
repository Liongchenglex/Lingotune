# Firestore Analysis Schema

**Date:** 2026-01-13
**Purpose:** Define how song analysis data is stored in Firestore

---

## TL;DR: Subcollection Structure

```
/songs/{songId}                    ← Main song document
└── /analysis (subcollection)      ← Analysis subcollection
    ├── /tokenization              ← Document
    ├── /vocabulary                ← Document
    ├── /grammar                   ← Document
    └── /pronunciation             ← Document
```

**Why subcollection?**
- ✅ Keeps main song document small and fast
- ✅ Can load analysis on-demand (not always needed)
- ✅ Easy to listen to individual sections for real-time updates
- ✅ Can add/remove analysis types without affecting song metadata
- ✅ Easier to regenerate specific sections

---

## Full Firestore Structure

### Example: Song with Complete Analysis

```
/songs/song-ko-001
├── id: "song-ko-001"
├── title: "Good Goodbye"
├── artist: "HWASA"
├── album: "Good Goodbye"
├── albumArt: ""
├── duration: 210000
├── spotifyUri: ""
├── previewUrl: ""
├── lyricsSource: "hardcoded"
├── geniusId: "song-ko-001"
├── geniusUrl: "https://example.com/song/song-ko-001"
├── lyricsLanguage: "ko"
├── lyricsConfidence: 0.95
├── language: "ko"
├── addedAt: Timestamp(2026-01-13T10:00:00Z)
│
└── /analysis (subcollection)
    │
    ├── /tokenization
    │   ├── tokens: [
    │   │     {
    │   │       morpheme: "나",
    │   │       pos: "pronoun",
    │   │       posTag: "Pronoun",
    │   │       lineIndex: 0,
    │   │       charOffset: 0
    │   │     },
    │   │     {
    │   │       morpheme: "를",
    │   │       pos: "particle",
    │   │       posTag: "Josa",
    │   │       lineIndex: 0,
    │   │       charOffset: 1
    │   │     },
    │   │     ... (all tokens)
    │   │   ]
    │   ├── totalTokens: 150
    │   └── processedAt: Timestamp(2026-01-13T10:00:05Z)
    │
    ├── /vocabulary
    │   ├── words: [
    │   │     {
    │   │       word: "나",
    │   │       variants: ["나를", "나의", "나는"],
    │   │       pos: "pronoun",
    │   │       definition: {
    │   │         en: "I, me",
    │   │         ko: "나 (first person pronoun)"
    │   │       },
    │   │       level: "beginner",
    │   │       frequency: 0.98,
    │   │       count: 15,
    │   │       lineIndices: [0, 2, 5, 8, 12]
    │   │     },
    │   │     {
    │   │       word: "짓밟다",
    │   │       variants: ["짓밟고", "짓밟아"],
    │   │       pos: "verb",
    │   │       definition: {
    │   │         en: "to trample, to step on",
    │   │         ko: "짓밟다 (to trample)"
    │   │       },
    │   │       level: "intermediate",
    │   │       frequency: 0.15,
    │   │       count: 2,
    │   │       lineIndices: [0, 4]
    │   │     },
    │   │     ... (all unique words)
    │   │   ]
    │   ├── totalWords: 45
    │   └── processedAt: Timestamp(2026-01-13T10:00:07Z)
    │
    ├── /grammar
    │   ├── patterns: [
    │   │     {
    │   │       pattern: "를/을",
    │   │       type: "particle",
    │   │       explanation: "Object marker - marks the direct object of a verb",
    │   │       example: "나를 사랑해 (Love me)",
    │   │       level: "beginner",
    │   │       lineIndices: [0, 3, 7]
    │   │     },
    │   │     {
    │   │       pattern: "-고",
    │   │       type: "connector",
    │   │       explanation: "Sequential connector - links two actions (and then)",
    │   │       example: "먹고 자다 (eat and sleep)",
    │   │       level: "beginner",
    │   │       lineIndices: [0, 5, 9]
    │   │     },
    │   │     ... (all grammar patterns)
    │   │   ]
    │   ├── totalPatterns: 12
    │   └── processedAt: Timestamp(2026-01-13T10:00:09Z)
    │
    └── /pronunciation
        ├── fullRomanization: "nareul geunyang jitbapgo ga / gwaenchana doraboji ma / ..."
        ├── lineByLine: [
        │     {
        │       original: "나를 그냥 짓밟고 가",
        │       romanization: "nareul geunyang jitbapgo ga"
        │     },
        │     {
        │       original: "괜찮아 돌아보지 마",
        │       romanization: "gwaenchana doraboji ma"
        │     },
        │     ... (all lines)
        │   ]
        └── processedAt: Timestamp(2026-01-13T10:00:10Z)
```

---

## Document Schemas

### `/songs/{songId}/analysis/tokenization`

```typescript
interface TokenizationDocument {
  tokens: Token[];
  totalTokens: number;
  processedAt: Timestamp;
}

interface Token {
  morpheme: string;        // "나"
  pos: string;             // "pronoun" (human-readable)
  posTag: string;          // "Pronoun" (KoNLPy tag)
  lineIndex: number;       // Which line (0-indexed)
  charOffset: number;      // Character position in full lyrics
}
```

**Example:**
```json
{
  "tokens": [
    {
      "morpheme": "나",
      "pos": "pronoun",
      "posTag": "Pronoun",
      "lineIndex": 0,
      "charOffset": 0
    },
    {
      "morpheme": "를",
      "pos": "particle",
      "posTag": "Josa",
      "lineIndex": 0,
      "charOffset": 1
    }
  ],
  "totalTokens": 150,
  "processedAt": "2026-01-13T10:00:05Z"
}
```

---

### `/songs/{songId}/analysis/vocabulary`

```typescript
interface VocabularyDocument {
  words: VocabularyWord[];
  totalWords: number;
  processedAt: Timestamp;
}

interface VocabularyWord {
  word: string;              // Base form: "나"
  variants: string[];        // ["나를", "나의", "나는"]
  pos: string;               // "pronoun"
  definition: {
    en: string;              // English definition
    ko: string;              // Korean definition/explanation
  };
  level: 'beginner' | 'intermediate' | 'advanced';
  frequency: number;         // 0-1 (how common in Korean)
  count: number;             // How many times in this song
  lineIndices: number[];     // Which lines contain this word
}
```

**Example:**
```json
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
    }
  ],
  "totalWords": 45,
  "processedAt": "2026-01-13T10:00:07Z"
}
```

---

### `/songs/{songId}/analysis/grammar`

```typescript
interface GrammarDocument {
  patterns: GrammarPattern[];
  totalPatterns: number;
  processedAt: Timestamp;
}

interface GrammarPattern {
  pattern: string;           // "를/을"
  type: 'particle' | 'ending' | 'connector' | 'tense';
  explanation: string;       // Human-readable explanation
  example: string;           // Example usage
  level: 'beginner' | 'intermediate' | 'advanced';
  lineIndices: number[];     // Which lines use this pattern
}
```

**Example:**
```json
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
    {
      "pattern": "-고",
      "type": "connector",
      "explanation": "Sequential connector - links two actions (and then)",
      "example": "먹고 자다 (eat and sleep)",
      "level": "beginner",
      "lineIndices": [0, 5, 9]
    }
  ],
  "totalPatterns": 12,
  "processedAt": "2026-01-13T10:00:09Z"
}
```

---

### `/songs/{songId}/analysis/pronunciation`

```typescript
interface PronunciationDocument {
  fullRomanization: string;    // Full lyrics romanized
  lineByLine: PronunciationLine[];
  processedAt: Timestamp;
}

interface PronunciationLine {
  original: string;            // Original Korean text
  romanization: string;        // Romanized text
}
```

**Example:**
```json
{
  "fullRomanization": "nareul geunyang jitbapgo ga / gwaenchana doraboji ma",
  "lineByLine": [
    {
      "original": "나를 그냥 짓밟고 가",
      "romanization": "nareul geunyang jitbapgo ga"
    },
    {
      "original": "괜찮아 돌아보지 마",
      "romanization": "gwaenchana doraboji ma"
    }
  ],
  "processedAt": "2026-01-13T10:00:10Z"
}
```

---

## Why Subcollection vs Single Document?

### Option A: Subcollection (✅ RECOMMENDED)

```
/songs/{songId}/analysis/vocabulary
/songs/{songId}/analysis/grammar
/songs/{songId}/analysis/pronunciation
```

**Pros:**
- ✅ Each document can be loaded independently
- ✅ Real-time listeners can subscribe to specific sections
- ✅ Won't exceed Firestore document size limit (1MB)
- ✅ Progressive loading (show vocab while grammar is processing)
- ✅ Easy to regenerate specific sections
- ✅ Clear separation of concerns

**Cons:**
- ⚠️ Requires multiple reads if you want all analysis at once

---

### Option B: Single Document (❌ NOT RECOMMENDED)

```
/songs/{songId}/analysis
{
  vocabulary: {...},
  grammar: {...},
  pronunciation: {...}
}
```

**Pros:**
- ✅ Single read to get all analysis

**Cons:**
- ❌ Large document size (could hit 1MB limit)
- ❌ Can't load sections independently
- ❌ Real-time listener gets ALL updates (even if you only care about vocab)
- ❌ Harder to regenerate specific sections
- ❌ All-or-nothing (if one section fails, whole doc is incomplete)

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Songs collection
    match /songs/{songId} {
      // Anyone can read songs
      allow read: if true;

      // Only authenticated users can write songs
      allow write: if request.auth != null;

      // Analysis subcollection
      match /analysis/{analysisType} {
        // Anyone can read analysis
        allow read: if true;

        // Only Cloud Functions can write analysis
        // (Cloud Functions have admin access, this rule is for client apps)
        allow write: if false;
      }
    }
  }
}
```

---

## Querying Analysis Data

### Frontend: Get All Analysis

```typescript
// Get song data
const songRef = doc(db, 'songs', songId);
const songSnap = await getDoc(songRef);
const songData = songSnap.data();

// Get analysis subcollection
const analysisRef = collection(songRef, 'analysis');
const analysisSnap = await getDocs(analysisRef);

const analysis = {};
analysisSnap.forEach((doc) => {
  analysis[doc.id] = doc.data();
});

// Now you have:
// analysis.vocabulary
// analysis.grammar
// analysis.pronunciation
```

### Frontend: Get Specific Analysis

```typescript
// Get only vocabulary
const vocabRef = doc(db, 'songs', songId, 'analysis', 'vocabulary');
const vocabSnap = await getDoc(vocabRef);
const vocabulary = vocabSnap.data();
```

### Frontend: Real-Time Listener

```typescript
// Listen for analysis updates in real-time
const analysisRef = collection(db, 'songs', songId, 'analysis');

const unsubscribe = onSnapshot(analysisRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added' || change.type === 'modified') {
      const analysisType = change.doc.id; // 'vocabulary', 'grammar', etc.
      const data = change.doc.data();

      console.log(`${analysisType} updated:`, data);

      // Update UI
      switch (analysisType) {
        case 'vocabulary':
          setVocabulary(data.words);
          break;
        case 'grammar':
          setGrammar(data.patterns);
          break;
        case 'pronunciation':
          setPronunciation(data);
          break;
      }
    }
  });
});

// Don't forget to unsubscribe
return () => unsubscribe();
```

---

## Storage Size Estimates

### Typical Song Analysis Size

**Song:** ~200 lines, ~500 words

- **Tokenization:** ~50KB (tokens array)
- **Vocabulary:** ~30KB (45 unique words with definitions)
- **Grammar:** ~10KB (12 patterns)
- **Pronunciation:** ~15KB (line-by-line romanization)

**Total:** ~105KB per song analysis

**Firestore Limits:**
- Max document size: 1MB ✅ (we're well under)
- Max subcollection documents: No limit ✅

---

## Data Migration Strategy

### If Analysis Schema Changes

If we need to update the analysis schema (e.g., add new fields):

1. **Add new field to schema** (e.g., `vocabulary.exampleSentences`)
2. **Update `analyzeLyrics` function** to generate new field
3. **Deploy new version**
4. **Regenerate analysis** for existing songs (admin script)

**Admin Script:**
```typescript
// Regenerate analysis for all songs
const songsRef = collection(db, 'songs');
const songsSnap = await getDocs(songsRef);

for (const songDoc of songsSnap.docs) {
  const songId = songDoc.id;

  // Delete old analysis
  const analysisRef = collection(songDoc.ref, 'analysis');
  const analysisSnap = await getDocs(analysisRef);
  for (const doc of analysisSnap.docs) {
    await deleteDoc(doc.ref);
  }

  // Trigger reanalysis by updating song (or call analyzeLyrics directly)
  await updateDoc(songDoc.ref, { lastUpdated: serverTimestamp() });

  console.log(`Regenerated analysis for ${songId}`);
}
```

---

## Summary

**Firestore Structure:**
```
/songs/{songId}                        ← Song metadata
└── /analysis (subcollection)          ← Analysis data
    ├── /tokenization                  ← Tokens with POS tags
    ├── /vocabulary                    ← Words with definitions
    ├── /grammar                       ← Grammar patterns
    └── /pronunciation                 ← Romanization
```

**Benefits:**
- ✅ Clean separation
- ✅ Progressive loading
- ✅ Real-time updates
- ✅ Easy to extend (add new analysis types)
- ✅ Won't hit size limits

**Next Step:** Implement `analyzeLyrics` Python Cloud Function to populate this structure.

Does this schema make sense? Any questions or suggestions?
