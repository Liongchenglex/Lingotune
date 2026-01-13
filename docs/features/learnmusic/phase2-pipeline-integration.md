# Phase 2: Pipeline Integration Strategy

**Date:** 2026-01-13
**Question:** When should the language analysis pipeline start? Should it continue from fetchLyrics?

---

## TL;DR: Create New Function `analyzeLyrics`

**Recommendation:** Create a **separate Firebase Function** called `analyzeLyrics` that runs **after** the song is saved to Firestore.

**Why not in fetchLyrics?**
- fetchLyrics should remain fast and focused
- Analysis is slow (30-60 seconds) - don't block user
- Analysis can fail without breaking song saving
- Can re-run analysis without re-fetching lyrics

---

## Current Flow Analysis

### Current Song Addition Flow

```
User selects song in SongSelectionScreen
  ↓
[1] fetchLyrics() called (Firebase Function)
    - Returns lyrics from hardcoded JSON
    - Duration: ~1-2 seconds
  ↓
[2] validateSongLanguage() (Frontend)
    - Simple language detection
    - Duration: ~500ms
  ↓
[3] User confirms (or sees warning)
  ↓
[4] saveSong() (Frontend)
    - Saves to /songs/{songId} (Firestore)
    - Saves to /users/{userId}/languages[i].songs[]
    - Duration: ~1-2 seconds
  ↓
[5] Navigate to LyricsScreen
    - User sees lyrics immediately
```

**Current Total Time:** ~3-4 seconds (fast, good UX)

---

## Option 1: Add Pipeline to fetchLyrics (❌ NOT RECOMMENDED)

### Flow with Pipeline in fetchLyrics

```
User selects song
  ↓
fetchLyrics() called
  ↓
  [1] Fetch lyrics from JSON (~1s)
  ↓
  [2] Run KoNLPy tokenization (~1s)
  ↓
  [3] Extract vocabulary (~2s)
  ↓
  [4] Analyze grammar (~5s)
  ↓
  [5] AI semantic analysis (~30s)
  ↓
  [6] AI emotion analysis (~20s)
  ↓
  [7] Generate pronunciation (~10s)
  ↓
  Return lyrics + analysis
  ↓
saveSong() with analysis
  ↓
Navigate to LyricsScreen (with full analysis)
```

**Total Time:** ~70 seconds (BAD UX)

### Problems

❌ **Terrible UX:** User waits 70 seconds before seeing lyrics
❌ **Function timeout:** Firebase Functions timeout at 60s (default) or 540s (max)
❌ **Blocking:** User can't interact with app while waiting
❌ **All-or-nothing:** If analysis fails, entire flow fails
❌ **No progress feedback:** User doesn't know what's happening
❌ **Waste of resources:** Re-analyzing if user cancels

---

## Option 2: Add Pipeline After saveSong (❌ NOT RECOMMENDED)

### Flow with Pipeline After saveSong

```
User selects song
  ↓
fetchLyrics() (~1s)
  ↓
saveSong() (~2s)
  ↓
Navigate to LyricsScreen (lyrics visible, no analysis yet)
  ↓
Run analysis pipeline in background (~70s)
  ↓
Update Firestore with analysis results
  ↓
LyricsScreen refreshes to show analysis
```

**Total Time to Lyrics:** ~3s (good)
**Total Time to Analysis:** ~73s (user sees loading state)

### Problems

❌ **Frontend can't run Python:** KoNLPy is Python-only
❌ **Mobile performance:** Tokenization is CPU-intensive
❌ **Battery drain:** Running NLP on mobile device
❌ **Network costs:** Multiple API calls from mobile
❌ **Inconsistent results:** Different devices may produce different analysis

---

## Option 3: New Firebase Function `analyzeLyrics` (✅ RECOMMENDED)

### Flow with Separate analyzeLyrics Function

```
User selects song
  ↓
[1] fetchLyrics() (~1s)
    Returns: { lyrics, source, geniusId, geniusUrl }
  ↓
[2] saveSong() (~2s)
    Saves to Firestore
    Triggers: analyzeLyrics() in background (Cloud Function trigger)
  ↓
[3] Navigate to LyricsScreen IMMEDIATELY
    Shows: Lyrics + "Analysis loading..." banner
  ↓
[Background] analyzeLyrics() Cloud Function (~70s)
  ↓
  [a] Read lyrics from /songs/{songId}
  ↓
  [b] Run tokenization (KoNLPy)
  ↓
  [c] Extract vocabulary
  ↓
  [d] Analyze grammar
  ↓
  [e] AI semantic analysis
  ↓
  [f] AI emotion analysis
  ↓
  [g] Generate pronunciation
  ↓
  [h] Save to /songs/{songId}/analysis (Firestore)
  ↓
[4] LyricsScreen listens to Firestore
    Real-time update: Analysis results appear as they're ready
```

**Total Time to Lyrics:** ~3s (user sees lyrics immediately)
**Total Time to Analysis:** ~73s (non-blocking, happens in background)

### Advantages

✅ **Fast UX:** User sees lyrics in 3 seconds
✅ **Non-blocking:** User can read lyrics while analysis runs
✅ **Progressive loading:** Show analysis sections as they complete
✅ **Retry-able:** Can re-run analysis without re-fetching lyrics
✅ **Scalable:** Analysis runs on Cloud Functions (Python support)
✅ **Failure isolation:** Analysis failure doesn't break song saving
✅ **Cost-efficient:** Only analyze once, cache forever

---

## Recommended Architecture

### New Firebase Function: `analyzeLyrics`

**Trigger:** Firestore onCreate trigger for `/songs/{songId}`

**Location:** `functions/src/analyzeLyrics.ts`

**Language:** TypeScript wrapper → Python subprocess (or Python Cloud Function)

**Flow:**
```typescript
// functions/src/analyzeLyrics.ts
import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

export const analyzeLyrics = functions.firestore
  .document('songs/{songId}')
  .onCreate(async (snap, context) => {
    const songId = context.params.songId;
    const songData = snap.data();

    // Don't analyze if already analyzed
    const analysisRef = snap.ref.collection('analysis').doc('vocabulary');
    const existingAnalysis = await analysisRef.get();
    if (existingAnalysis.exists) {
      console.log('Song already analyzed, skipping');
      return null;
    }

    try {
      // Step 1: Tokenization
      const tokens = await runTokenization(songData.lyrics, songData.language);

      // Save tokenization results immediately (fast feedback)
      await snap.ref.collection('analysis').doc('tokenization').set({
        tokens,
        processedAt: new Date(),
      });

      // Step 2: Vocabulary extraction
      const vocabulary = await extractVocabulary(tokens);

      // Save vocabulary (user can start learning words)
      await snap.ref.collection('analysis').doc('vocabulary').set({
        words: vocabulary,
        processedAt: new Date(),
      });

      // Step 3: Grammar analysis
      const grammar = await analyzeGrammar(tokens);

      await snap.ref.collection('analysis').doc('grammar').set({
        patterns: grammar,
        processedAt: new Date(),
      });

      // Step 4-6: AI analysis (slow, but user already has vocab/grammar)
      const [semantics, emotion, pronunciation] = await Promise.all([
        analyzeSemantics(songData.lyrics, songData.title, songData.artist),
        analyzeEmotion(songData.lyrics, songData.title),
        generatePronunciation(songData.lyrics, songData.language),
      ]);

      // Save AI results
      await snap.ref.collection('analysis').doc('semantics').set(semantics);
      await snap.ref.collection('analysis').doc('emotion').set(emotion);
      await snap.ref.collection('analysis').doc('pronunciation').set(pronunciation);

      console.log(`✅ Analysis complete for song ${songId}`);
      return null;
    } catch (error) {
      console.error(`❌ Analysis failed for song ${songId}:`, error);

      // Save error state so UI can show retry button
      await snap.ref.collection('analysis').doc('error').set({
        error: error.message,
        timestamp: new Date(),
        retryable: true,
      });

      throw error; // Let Cloud Functions retry
    }
  });
```

### Firestore Structure

```
/songs/{songId}
├── id: "song-ko-001"
├── title: "Good Goodbye"
├── artist: "HWASA"
├── lyrics: "나를 그냥 짓밟고 가..."
├── language: "ko"
├── addedAt: Timestamp
└── /analysis (subcollection)
    ├── /tokenization
    │   ├── tokens: [...]
    │   └── processedAt: Timestamp
    ├── /vocabulary
    │   ├── words: [{ word: "나를", definition: "...", ... }]
    │   └── processedAt: Timestamp
    ├── /grammar
    │   ├── patterns: [{ pattern: "-고", explanation: "...", ... }]
    │   └── processedAt: Timestamp
    ├── /semantics
    │   ├── literalMeaning: "..."
    │   ├── figurativeMeaning: "..."
    │   └── processedAt: Timestamp
    ├── /emotion
    │   ├── overallTone: ["melancholic"]
    │   └── processedAt: Timestamp
    └── /pronunciation
        ├── romanization: "..."
        ├── audioUrl: "..."
        └── processedAt: Timestamp
```

**Why subcollection?**
- Each analysis step can be saved independently
- Progressive loading (show vocab while grammar is processing)
- Easy to listen to individual sections in real-time
- Can regenerate specific sections without re-running entire pipeline

---

## LyricsScreen Real-Time Updates

### Frontend Firestore Listener

```typescript
// src/screens/music/LyricsScreen.tsx
import { doc, collection, onSnapshot } from 'firebase/firestore';

useEffect(() => {
  const songRef = doc(db, 'songs', songId);
  const analysisRef = collection(songRef, 'analysis');

  // Listen for analysis updates in real-time
  const unsubscribe = onSnapshot(analysisRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const docName = change.doc.id;
        const data = change.doc.data();

        switch (docName) {
          case 'vocabulary':
            setVocabulary(data.words);
            setVocabularyLoading(false);
            break;
          case 'grammar':
            setGrammar(data.patterns);
            setGrammarLoading(false);
            break;
          case 'semantics':
            setSemantics(data);
            setSemanticsLoading(false);
            break;
          case 'emotion':
            setEmotion(data);
            setEmotionLoading(false);
            break;
          case 'pronunciation':
            setPronunciation(data);
            setPronunciationLoading(false);
            break;
          case 'error':
            setAnalysisError(data.error);
            break;
        }
      }
    });
  });

  return () => unsubscribe();
}, [songId]);
```

### User Experience

1. **0s:** User adds song, navigates to LyricsScreen
   - Sees: Lyrics (plain text)
   - Sees: Banner "Analyzing vocabulary, grammar, and meaning... ⏳"

2. **~5s:** Vocabulary analysis completes
   - Words become clickable
   - Banner updates: "Analyzing grammar and meaning... ⏳"

3. **~10s:** Grammar analysis completes
   - Grammar patterns highlighted
   - Banner updates: "Analyzing meaning and emotion... ⏳"

4. **~70s:** Full analysis completes
   - All features available
   - Banner disappears

5. **User leaves and returns:** All analysis still there (cached)

---

## Implementation Strategy

### Phase 1: Setup Infrastructure

1. Create `functions/src/analyzeLyrics.ts`
2. Set up Python environment for KoNLPy
3. Add Firestore trigger for song creation
4. Test with hardcoded song

### Phase 2: Implement Tokenization & Vocabulary

1. Integrate KoNLPy (Okt tokenizer)
2. Build vocabulary extraction logic
3. Save to Firestore `/songs/{songId}/analysis/vocabulary`
4. Update LyricsScreen to listen for vocabulary updates
5. Add clickable word UI

### Phase 3: Add Grammar Analysis

1. Build rule-based grammar pattern detection
2. Save to Firestore `/songs/{songId}/analysis/grammar`
3. Update LyricsScreen to show grammar patterns

### Phase 4: Add AI Analysis (Semantics + Emotion)

1. Integrate Claude API
2. Build semantic analysis prompts
3. Build emotion analysis prompts
4. Save to Firestore
5. Update LyricsScreen UI

### Phase 5: Add Pronunciation

1. Integrate hangul-romanization
2. Integrate Google Cloud TTS
3. Generate audio files
4. Upload to Firebase Storage
5. Save URLs to Firestore

---

## Alternative: Manual Trigger

If you want more control over when analysis runs:

### Option 3B: On-Demand Analysis

**Trigger:** User clicks "Analyze Song" button in LyricsScreen

**Flow:**
```
User opens LyricsScreen
  ↓
Sees lyrics (plain text) + "Analyze Song" button
  ↓
User clicks "Analyze Song"
  ↓
Frontend calls analyzeLyrics() Cloud Function (HTTP callable)
  ↓
Function runs analysis (~70s)
  ↓
Real-time updates as analysis progresses
```

**Advantages:**
- ✅ User control (doesn't analyze every song automatically)
- ✅ Cost savings (only analyze songs users care about)
- ✅ Can charge credits/premium for analysis

**Disadvantages:**
- ❌ Extra user action required
- ❌ Slower time-to-value (user must wait and click)

---

## Recommended: Automatic Trigger (Option 3)

**Why automatic is better:**
1. **Seamless UX:** No extra clicks, analysis just appears
2. **Feels magical:** User adds song → analysis auto-populates
3. **Higher engagement:** Users discover features passively
4. **Progressive loading:** Vocabulary appears in 5s, full analysis in 70s

**Cost mitigation:**
- Cache analysis forever (only run once per song)
- Multiple users adding same song → analysis already exists
- Phase 2A (vocab only) is cheap (~$0.001 per song)
- Phase 2C (full AI) is more expensive (~$0.05 per song) but optional

---

## Decision Matrix

| Approach | Time to Lyrics | Time to Analysis | UX | Cost | Complexity |
|----------|---------------|------------------|----|----|-----------|
| **Option 1: In fetchLyrics** | 70s | 70s | ❌ Bad | $ | Low |
| **Option 2: Frontend** | 3s | 73s | ❌ Bad | $$ | High |
| **Option 3: Background Function** | 3s | 73s | ✅ Good | $ | Medium |
| **Option 3B: Manual Trigger** | 3s | 73s + click | ⚠️ OK | $ | Medium |

---

## Final Recommendation

**Create `analyzeLyrics` Firebase Function with Firestore trigger:**

```typescript
// functions/src/index.ts
export { analyzeLyrics } from './analyzeLyrics';
```

**Trigger:** Automatically when song is created in `/songs/{songId}`

**Progressive updates:** Save each analysis step to subcollection as it completes

**Real-time UI:** LyricsScreen listens to Firestore and updates as analysis progresses

**User experience:**
- Sees lyrics in 3 seconds
- Sees vocabulary in 5 seconds
- Sees full analysis in 70 seconds
- No blocking, no waiting, magical experience

---

## Next Steps

1. Decide: Automatic trigger vs Manual trigger?
2. Set up Python environment for KoNLPy in Cloud Functions
3. Build `analyzeLyrics` function structure
4. Implement Phase 2A (vocabulary only) first
5. Test with real Korean songs

What do you think? Automatic trigger or manual?
