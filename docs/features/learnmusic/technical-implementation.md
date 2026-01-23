# Learn Music - Technical Implementation

**Last Updated:** 2026-01-23
**Current Phase:** Phase 2A.1 Complete

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Token Display System](#token-display-system)
4. [Component Structure](#component-structure)
5. [Firebase Schema](#firebase-schema)
6. [Security Implementation](#security-implementation)
7. [Rate Limiting](#rate-limiting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Native App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Song         │  │ Lyrics       │  │ Tokenized    │      │
│  │ Selection    │─>│ Screen       │─>│ Lyrics       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
         ┌──────▼──────┐                   ┌───────▼────────┐
         │  Firebase   │                   │   Firestore    │
         │  Functions  │                   │   (Real-time)  │
         └──────┬──────┘                   └───────┬────────┘
                │                                   │
    ┌───────────┴──────────┐                      │
    │                      │                       │
┌───▼────┐        ┌───────▼─────┐         ┌──────▼───────┐
│ fetch  │        │  analyze    │         │ songs/       │
│ Lyrics │        │  Lyrics     │         │ {id}/        │
└────┬───┘        │  Trigger    │         │ analysis/    │
     │            └───────┬─────┘         │ {doc}        │
     │                    │               └──────────────┘
     │            ┌───────▼─────┐
     │            │ Cloud Run   │
     │            │ (Python)    │
     │            │ - KoNLPy    │
     │            │ - Analysis  │
     │            └─────────────┘
     │
┌────▼────┐
│ Hardcoded│
│ Songs    │
│ (MVP)    │
└──────────┘
```

---

## Data Flow

### Song Selection → Lyrics Display

1. **User selects song** (`SongSelectionScreen.tsx`)
   - Calls `fetchLyrics` Firebase Function
   - Validates language
   - Saves song to Firestore `/songs/{songId}`

2. **Firestore onCreate trigger** (`analyzeLyricsTrigger.ts`)
   - Detects new song document
   - Calls Cloud Run service with lyrics
   - Cloud Run analyzes Korean text (tokenization, vocabulary, grammar, pronunciation)

3. **Analysis results saved** to `/songs/{songId}/analysis/`
   - `tokenization` - Individual morphemes with POS tags
   - `vocabulary` - Unique words with definitions
   - `grammar` - Detected patterns
   - `pronunciation` - Romanization

4. **Real-time display** (`LyricsScreen.tsx` + `useAnalysis` hook)
   - `useAnalysis` subscribes to analysis subcollection
   - Updates UI in real-time as analysis completes
   - Displays interactive tokenized lyrics

---

## Token Display System

### **How Tokens, Vocabulary, Grammar, and Pronunciation Interact**

#### 1. Token Structure

Each token represents a Korean morpheme (smallest meaningful unit):

```typescript
interface Token {
  morpheme: string;     // "사랑"
  pos: string;          // "noun"
  posTag: string;       // "Noun" (KoNLPy tag)
  lineIndex: number;    // 0 (first line)
  charOffset: number;   // 5 (position in line)
}
```

#### 2. Vocabulary Relationship

**Vocabulary words are derived FROM tokens:**

```typescript
interface VocabularyWord {
  word: string;         // Same as token.morpheme
  pos: string;          // Same as token.pos
  count: number;        // How many times this token appears
  lineIndices: number[]; // Which lines contain this token
  definition?: {
    ko?: string;        // Korean definition
    en?: string;        // English definition
  };
}
```

**Display Logic** (`TokenizedLyrics.tsx`):
```typescript
// Check if a token is in vocabulary
const isVocabularyWord = (token: Token): boolean => {
  return vocabularyWords.some((word) => word.word === token.morpheme);
};

// Visual indication
<Text style={[
  styles.token,
  isVocabularyWord(token) && styles.vocabularyToken, // Underlined
]}>
  {token.morpheme}
</Text>
```

**Result:**
- **Underlined tokens** = Part of vocabulary (important words to learn)
- **Regular tokens** = Functional morphemes (particles, endings, etc.)

#### 3. Grammar Pattern Relationship

**Grammar patterns are detected ACROSS multiple tokens in a line:**

```typescript
interface GrammarPattern {
  example: string;        // "을/를 좋아하다" (actual text from lyrics)
  explanation: string;    // "Express liking or preference"
  level: string;          // "beginner"
  lineIndices: number[];  // [0, 5, 12] (which lines have this pattern)
}
```

**Display Logic** (`TokenizedLyrics.tsx`):
```typescript
// Group tokens by line
const lineMap = new Map<number, LineData>();
tokens.forEach((token) => {
  if (!lineMap.has(token.lineIndex)) {
    lineMap.set(token.lineIndex, {
      tokens: [],
      grammarPatterns: []
    });
  }
  lineMap.get(token.lineIndex).tokens.push(token);
});

// Add grammar patterns to lines
grammarPatterns.forEach((pattern) => {
  pattern.lineIndices.forEach((lineIndex) => {
    lineMap.get(lineIndex).grammarPatterns.push(pattern);
    lineMap.get(lineIndex).hasGrammar = true;
  });
});
```

**Display:**
```typescript
{line.hasGrammar && (
  <TouchableOpacity onPress={() => onGrammarPress(line.grammarPatterns)}>
    <Text style={styles.grammarIcon}>ⓘ</Text>
  </TouchableOpacity>
)}
```

**Result:**
- Lines with grammar patterns show an **ⓘ icon**
- Tapping icon shows bottom sheet with all patterns in that line

#### 4. Pronunciation Relationship

**Pronunciation is PER LINE, not per token:**

```typescript
interface Romanization {
  original: string;      // "사랑해요" (Korean text)
  romanization: string;  // "saranghaeyo" (romanized)
}

interface PronunciationData {
  romanizations: Romanization[]; // Array indexed by line number
}
```

**WHY NOT PER TOKEN?**
Korean pronunciation changes based on context (연음, sound linking):
- Individual tokens: "사랑" + "해요"
- Pronounced together: "사랑해요" → "sa-rang-hae-yo" (not "sa-rang he-yo")

**Display Logic** (`TokenizedLyrics.tsx`):
```typescript
// Add romanization to line data
romanizations.forEach((r, index) => {
  if (lineMap.has(index)) {
    lineMap.get(index).romanization = r.romanization;
  }
});

// Display below Korean text
{line.romanization && (
  <View style={styles.romanizationContainer}>
    {!hiddenRomanizationLines.has(line.lineIndex) && (
      <Text style={styles.romanization}>{line.romanization}</Text>
    )}
    <TouchableOpacity onPress={() => toggleLineRomanization(line.lineIndex)}>
      <Text>{hiddenRomanizationLines.has(line.lineIndex) ? '👁️ Show' : '🙈 Hide'}</Text>
    </TouchableOpacity>
  </View>
)}
```

**Result:**
- Romanization appears **below each line**
- Each line has its own **Show/Hide toggle**
- No romanization shown in token detail bottom sheet (not applicable)

### **Visual Hierarchy**

```
┌─────────────────────────────────────────────┐
│  사랑 해요 [ⓘ]                              │  ← Tokens + Grammar icon
│  saranghaeyo                [🙈 Hide]        │  ← Romanization + Toggle
└─────────────────────────────────────────────┘
   ↑      ↑    ↑
   │      │    └─ Grammar pattern indicator
   │      └────── Token (underlined if in vocabulary)
   └──────────── Line of tokens
```

### **Interaction Flow**

1. **Tap underlined token** → `TokenDetailBottomSheet`
   - Shows: Korean word, POS, frequency, definition, line numbers
   - No romanization (line-level only)

2. **Tap ⓘ icon** → `GrammarPatternBottomSheet`
   - Shows: All grammar patterns in that line
   - Displays: example, explanation, level

3. **Tap Show/Hide** → Toggle romanization for that line only
   - Per-line control (not global toggle)
   - State stored in component: `Set<number>` of hidden line indices

---

## Component Structure

### **Frontend Components**

```
src/screens/music/
├── SongSelectionScreen.tsx    - Browse and select songs
└── LyricsScreen.tsx            - Main lyrics display screen

src/components/music/
├── AnalysisStatusBanner.tsx        - Shows analysis progress
├── TokenizedLyrics.tsx             - Interactive token display
├── TokenDetailBottomSheet.tsx      - Vocabulary word details
└── GrammarPatternBottomSheet.tsx   - Grammar explanations

src/hooks/
└── useAnalysis.ts              - Real-time Firestore data fetching
```

### **Backend Functions**

```
functions/src/
├── fetchLyrics.ts              - Fetch lyrics (hardcoded MVP)
├── analyzeLyricsTrigger.ts     - Firestore trigger for new songs
├── rateLimiter.ts              - Server-side rate limiting
└── searchSongs.ts              - Song search functionality

functions/python-cloudrun/
├── main.py                     - Flask app entry point
├── tokenizer.py                - Korean tokenization (KoNLPy)
├── vocabulary.py               - Extract vocabulary words
├── grammar.py                  - Detect grammar patterns
└── pronunciation.py            - Generate romanization
```

---

## Firebase Schema

### `/songs/{songId}`

```javascript
{
  id: "song-ko-001",
  title: "Song Title",
  artist: "Artist Name",
  language: "ko",
  albumArt: "https://...",
  // lyrics field DELETED after analysis (copyright protection)
  addedAt: Timestamp
}
```

### `/songs/{songId}/analysis/tokenization`

```javascript
{
  tokens: [
    {
      morpheme: "사랑",
      pos: "noun",
      posTag: "Noun",
      lineIndex: 0,
      charOffset: 0
    },
    // ...
  ],
  totalTokens: 245,
  processedAt: Timestamp
}
```

### `/songs/{songId}/analysis/vocabulary`

```javascript
{
  words: [
    {
      word: "사랑",
      pos: "noun",
      count: 8,
      lineIndices: [0, 3, 5, 12],
      frequency: 0.032,  // 8/245 tokens
      level: "beginner",
      definition: {
        ko: "애정; 좋아하는 감정",
        en: "love; affection"
      }
    },
    // ...
  ],
  totalWords: 87,
  processedAt: Timestamp
}
```

### `/songs/{songId}/analysis/grammar`

```javascript
{
  patterns: [
    {
      example: "을/를 좋아하다",
      explanation: "Express liking or preference for something",
      level: "beginner",
      lineIndices: [2, 7]
    },
    // ...
  ],
  totalPatterns: 12,
  processedAt: Timestamp
}
```

### `/songs/{songId}/analysis/pronunciation`

```javascript
{
  lineByLine: [
    {
      original: "사랑해요",
      romanization: "saranghaeyo"
    },
    // ... one per line
  ],
  fullRomanization: "saranghaeyo...",  // Full song romanized
  processedAt: Timestamp
}
```

### `/rateLimits/{userId}/actions/{actionName}`

```javascript
{
  count: 5,              // Current request count
  windowStart: 1706000000000,  // Timestamp of window start
  lastRequest: 1706000030000   // Last request time
}
```

**Security:** No client read/write access (server-side only)

---

## Security Implementation

### 1. **Authentication**

All Firebase Functions enforce authentication:

```typescript
// fetchLyrics.ts
if (!context.auth) {
  return {
    error: 'lyrics_not_found',
    message: 'Authentication required',
    retryable: false,
  };
}
```

### 2. **Authorization**

Firestore rules enforce ownership and permissions:

```javascript
// Songs: Shared resources
match /songs/{songId} {
  allow read: if isAuthenticated();
  allow create, update: if isAuthenticated();
  allow delete: if false;

  // Analysis: Read-only from client
  match /analysis/{analysisDoc} {
    allow read: if isAuthenticated();
    allow write: if false;  // Only Cloud Functions
  }
}

// Rate limits: Server-side only
match /rateLimits/{userId} {
  allow read, write: if false;  // No client access
}
```

### 3. **Input Validation**

**Cloud Run** (`main.py`):
```python
MAX_LYRICS_LENGTH = 50000   # 50KB
MAX_SONG_ID_LENGTH = 100

if len(lyrics) > MAX_LYRICS_LENGTH:
    return jsonify({'error': 'Lyrics too long'}), 400
```

**Frontend** (`SongSelectionScreen.tsx`):
```typescript
const MAX_SONGS_PER_LANGUAGE = 50;
if (currentSongCount >= MAX_SONGS_PER_LANGUAGE) {
  Alert.alert('Song Limit Reached', ...);
  throw new Error('Song quota exceeded');
}
```

### 4. **Error Sanitization**

**Before:**
```typescript
return {
  error: 'lyrics_not_found',
  technicalDetails: `No song found with ID: ${songId}`, // ❌ Leaked
};
```

**After:**
```typescript
return {
  error: 'lyrics_not_found',
  message: 'Song not found. Please try another song.',
  retryable: false,
  // ✅ No technical details exposed
};
```

### 5. **Copyright Protection**

Lyrics are **deleted immediately after analysis**:

```python
# main.py - after analysis completes
def delete_lyrics(song_id: str):
    db.collection('songs').document(song_id).update({
        'lyrics': firestore.DELETE_FIELD
    })
```

---

## Rate Limiting

### Architecture

**Server-side enforcement using Firestore atomic transactions:**

```typescript
// rateLimiter.ts
export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Atomic transaction
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const data = doc.data();

    // Initialize or reset if window expired
    if (!data || data.windowStart < windowStart) {
      transaction.set(rateLimitRef, {
        count: 1,
        windowStart: now,
        lastRequest: now,
      });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    // Check limit
    if (data.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((data.windowStart + config.windowMs - now) / 1000),
      };
    }

    // Increment
    transaction.update(rateLimitRef, {
      count: data.count + 1,
      lastRequest: now,
    });

    return { allowed: true, remaining: config.maxRequests - data.count - 1 };
  });

  return result;
}
```

### Rate Limits

| Action | Max Requests | Time Window |
|--------|-------------|-------------|
| `fetchLyrics` | 10 | 1 minute |
| `searchSongs` | 20 | 1 minute |
| `saveSong` | 5 | 1 minute |

### Integration

```typescript
// fetchLyrics.ts
const rateLimitResult = await checkRateLimit(
  context.auth.uid,
  'fetchLyrics',
  RATE_LIMITS.fetchLyrics
);

if (!rateLimitResult.allowed) {
  return {
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please try again later.',
    retryable: true,
    retryAfter: rateLimitResult.retryAfter,
  };
}
```

### Why Server-Side?

❌ **Client-side rate limiting is insecure:**
- Users can clear app data
- App can be reverse-engineered
- No protection against bots

✅ **Server-side rate limiting is secure:**
- Cannot be bypassed
- Works across all devices
- Protects against automated attacks
- Uses atomic Firestore transactions (no race conditions)

---

## Key Technical Decisions

### 1. **Real-time Updates (onSnapshot)**

Using Firestore real-time listeners instead of polling:

```typescript
// useAnalysis.ts
const vocabUnsub = onSnapshot(
  doc(analysisRef, 'vocabulary'),
  (snapshot) => {
    if (snapshot.exists()) {
      setState((prev) => ({
        ...prev,
        vocabulary: {
          words: snapshot.data().words,
          processedAt: snapshot.data().processedAt,
        },
      }));
    }
  }
);
```

**Benefits:**
- No polling overhead
- Instant updates when analysis completes
- Battery efficient
- Firebase SDK handles reconnection

### 2. **Array Serialization Handling**

Firestore sometimes stores arrays as indexed objects:

```typescript
// Handle both formats
let words = data.words;
if (words && !Array.isArray(words)) {
  // Convert {0: {...}, 1: {...}} to [{...}, {...}]
  words = Object.keys(words)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(key => words[key]);
}
```

### 3. **Per-Line Romanization**

Romanization is line-level, not token-level:

**Reason:** Korean pronunciation has **sound linking (연음)**
- Tokens: "사랑" + "해" = "sa-rang" + "hae"
- Actual: "사랑해" = "sa-rang-hae" (linked)

Token-level romanization would be **linguistically incorrect**.

### 4. **Graceful Degradation**

If analysis fails or isn't available:

```typescript
{analysis.status === 'complete' && analysis.tokenization ? (
  <TokenizedLyrics tokens={...} />
) : (
  <Text style={styles.lyricsText}>{lyrics}</Text>  // Fallback
)}
```

Users can still read lyrics even if analysis fails.

---

## Performance Considerations

### 1. **Memoization**

```typescript
// TokenizedLyrics.tsx
const lines = useMemo<LineData[]>(() => {
  // Expensive computation only runs when dependencies change
  return groupTokensByLine(tokens, romanizations, grammarPatterns);
}, [tokens, romanizations, grammarPatterns]);
```

### 2. **Firestore Indexes**

Required composite indexes:
- `songs` collection: `language ASC, addedAt DESC`
- `rateLimits/{userId}/actions` collection: `windowStart ASC`

### 3. **Cloud Run Concurrency**

```bash
gcloud run services update korean-analysis \
  --concurrency=10 \
  --max-instances=5
```

Prevents overwhelming the analysis service.

---

## Deployment

### Firebase Functions
```bash
npm run build
firebase deploy --only functions:default
```

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Cloud Run (Python)
```bash
cd functions/python-cloudrun
gcloud run deploy korean-analysis \
  --source . \
  --region us-central1 \
  --no-allow-unauthenticated
```

---

## Monitoring

### Firebase Console
- **Functions Logs:** https://console.firebase.google.com/project/PROJECT_ID/functions/logs
- **Firestore Data:** https://console.firebase.google.com/project/PROJECT_ID/firestore/data

### Rate Limit Data
```
Firestore → rateLimits → {userId} → actions → {action}
```

Check for users hitting limits frequently (may indicate abuse or need to adjust limits).

---

## Future Enhancements (Documented for Reference)

### Phase 2A.2 - Dictionary Integration
- Fetch definitions from external API
- Add pronunciation audio
- Add example sentences

### Phase 2B - Grammar Lessons
- Detailed grammar explanations
- Practice exercises
- Progression tracking

### Phase 2C - Spaced Repetition Flashcards
- Create flashcards from vocabulary
- SRS algorithm implementation
- Progress tracking

---

**Document Status:** ✅ Up-to-date with Phase 2A.1 implementation
