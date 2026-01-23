# Phase 2A.1: Display Analysis Results - Requirements

**Date:** 2026-01-14
**Status:** Planning
**Goal:** Display Korean lyrics analysis (tokenization, vocabulary, grammar, pronunciation) in LyricsScreen

---

## 1. User Goals

**Primary Goal:**
As a Korean language learner, I want to see analyzed lyrics with vocabulary, grammar, and pronunciation information so I can learn Korean from songs.

**User Stories:**

1. **View Analyzed Lyrics**
   - As a user, when I open lyrics for a Korean song that has been analyzed
   - I should see the lyrics with interactive analysis features
   - So I can learn vocabulary and grammar from the song

2. **Check Analysis Status**
   - As a user, when I open lyrics for a Korean song
   - I should see if the song has been analyzed or is still processing
   - So I know whether learning features are available

3. **View Romanization**
   - As a user, I want to toggle romanization on/off
   - So I can see how to pronounce Korean words

4. **View Vocabulary List**
   - As a user, I want to see a list of vocabulary words from the song
   - With their frequency and part of speech
   - So I can understand which words appear in the song

---

## 2. Acceptance Criteria

### 2.1 Analysis Status Display

**AC1: Show analysis loading state**
- GIVEN a Korean song is being analyzed (analysis exists but not complete)
- WHEN user opens LyricsScreen
- THEN show "Analyzing lyrics..." message with loading indicator
- AND disable interactive features
- AND show plain lyrics

**AC2: Show analysis complete state**
- GIVEN a Korean song has been analyzed successfully
- WHEN user opens LyricsScreen
- THEN show analysis results (vocabulary count, grammar patterns, etc.)
- AND enable interactive features (romanization toggle, vocabulary list)

**AC3: Show analysis error state**
- GIVEN a Korean song analysis failed
- WHEN user opens LyricsScreen
- THEN show error message from `/songs/{songId}/analysis/error`
- AND show "Retry Analysis" button (if retryable)
- AND show plain lyrics as fallback

**AC4: Show no analysis state (non-Korean songs)**
- GIVEN a non-Korean song
- WHEN user opens LyricsScreen
- THEN show plain lyrics only
- AND hide analysis features
- AND show message "Analysis only available for Korean songs"

### 2.2 Romanization Display

**AC5: Toggle romanization**
- GIVEN a Korean song with pronunciation analysis
- WHEN user taps "Show Romanization" toggle
- THEN display romanization below each line of Korean lyrics
- AND remember toggle state for this session

**AC6: Romanization formatting**
- GIVEN romanization is enabled
- WHEN displaying romanized text
- THEN show in smaller, lighter font below original line
- AND align with original Korean text

### 2.3 Vocabulary List Display

**AC7: Show vocabulary panel**
- GIVEN a Korean song with vocabulary analysis
- WHEN user taps "Vocabulary" button
- THEN show bottom sheet with vocabulary list
- AND sort by frequency (most common first)

**AC8: Vocabulary item display**
- GIVEN vocabulary list is open
- WHEN displaying each word
- THEN show: word, romanization, part of speech, count
- AND group by part of speech (nouns, verbs, adjectives, adverbs)

**AC9: Filter vocabulary by POS**
- GIVEN vocabulary list is open
- WHEN user selects POS filter (e.g., "Nouns only")
- THEN show only words of that part of speech

### 2.4 Grammar Patterns Display (Optional for v1)

**AC10: Show grammar summary**
- GIVEN a Korean song with grammar analysis
- WHEN displaying analysis summary
- THEN show count of detected patterns
- AND show most common patterns (top 3)

---

## 3. Data Structure (Firestore)

### 3.1 Analysis Subcollection

```typescript
/songs/{songId}/analysis/tokenization
{
  tokens: [
    {
      morpheme: "나",
      pos: "pronoun",
      posTag: "Pronoun",
      lineIndex: 0,
      charOffset: 0
    },
    ...
  ],
  processedAt: Timestamp
}

/songs/{songId}/analysis/vocabulary
{
  words: [
    {
      word: "나",
      pos: "Pronoun",
      count: 3,
      lines: ["나를 사랑해", "나는 괜찮아", ...]
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

/songs/{songId}/analysis/error (if analysis failed)
{
  error: "Error message",
  timestamp: Timestamp,
  retryable: true/false
}
```

---

## 4. UI/UX Design

### 4.1 LyricsScreen Layout

```
┌─────────────────────────────────┐
│ ← Back         Lyrics           │
│         Song Title              │
│         Artist Name             │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📊 Analysis Complete        │ │
│ │ 177 words · 24 patterns     │ │
│ │ ┌──────────┐ ┌────────────┐ │ │
│ │ │ 한글/Abc  │ │ Vocabulary │ │ │
│ │ └──────────┘ └────────────┘ │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Lyrics                      │ │
│ │                             │ │
│ │ 나를 그냥 짓밟고 가          │ │
│ │ nareul geunyang jitbapgo ga │ │ ← Romanization (toggle)
│ │                             │ │
│ │ 괜찮아 돌아보지 마           │ │
│ │ gwaenchana doraboji ma      │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### 4.2 Analysis States UI

**Loading State:**
```
┌─────────────────────────────────┐
│ 🔄 Analyzing lyrics...          │
│ This may take ~10 seconds       │
└─────────────────────────────────┘
```

**Complete State:**
```
┌─────────────────────────────────┐
│ ✅ Analysis Complete            │
│ 177 words · 24 patterns         │
│ [Romanization] [Vocabulary]     │
└─────────────────────────────────┘
```

**Error State:**
```
┌─────────────────────────────────┐
│ ❌ Analysis Failed              │
│ Language not supported yet      │
│ [Retry] (if retryable)          │
└─────────────────────────────────┘
```

**No Analysis (Non-Korean):**
```
┌─────────────────────────────────┐
│ ℹ️ Analysis not available       │
│ Only Korean songs supported     │
└─────────────────────────────────┘
```

### 4.3 Vocabulary Bottom Sheet

```
┌─────────────────────────────────┐
│ Vocabulary (177 words)          │
│ [All] [Nouns] [Verbs] [Adj]    │ ← Filter tabs
├─────────────────────────────────┤
│                                 │
│ Nouns (89)                      │
│ ┌─────────────────────────────┐ │
│ │ 사랑 (sarang)               │ │
│ │ Noun · Appears 5 times      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 마음 (maeum)                │ │
│ │ Noun · Appears 3 times      │ │
│ └─────────────────────────────┘ │
│                                 │
│ Verbs (45)                      │
│ ┌─────────────────────────────┐ │
│ │ 사랑하다 (saranghada)       │ │
│ │ Verb · Appears 4 times      │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 5. Technical Implementation

### 5.1 Data Fetching

**Hook: `useAnalysis(songId)`**
```typescript
interface AnalysisState {
  status: 'loading' | 'complete' | 'error' | 'none';
  tokenization: Tokenization | null;
  vocabulary: Vocabulary | null;
  grammar: Grammar | null;
  pronunciation: Pronunciation | null;
  error: AnalysisError | null;
}

const useAnalysis = (songId: string) => {
  // Subscribe to /songs/{songId}/analysis subcollection
  // Check for error document first
  // Load tokenization, vocabulary, grammar, pronunciation
  // Return aggregated state
};
```

### 5.2 Components to Create

1. **AnalysisStatusBanner**
   - Shows analysis status (loading/complete/error/none)
   - Displays word count, pattern count
   - Shows toggle buttons (romanization, vocabulary)

2. **LyricsWithRomanization**
   - Displays Korean lyrics
   - Optionally shows romanization below each line
   - Responsive to romanization toggle

3. **VocabularyBottomSheet**
   - Full-screen bottom sheet
   - Filterable vocabulary list
   - Grouped by part of speech
   - Shows word, romanization, POS, frequency

4. **AnalysisError**
   - Shows error message
   - Retry button (if retryable)
   - Falls back to plain lyrics

### 5.3 State Management

```typescript
// LyricsScreen state
const [showRomanization, setShowRomanization] = useState(false);
const [vocabularyOpen, setVocabularyOpen] = useState(false);
const [posFilter, setPosFilter] = useState<string | null>(null); // 'Noun', 'Verb', etc.

// Analysis hook
const {
  status,
  vocabulary,
  pronunciation,
  error
} = useAnalysis(songId);
```

---

## 6. Error Handling & Edge Cases

### 6.1 Edge Cases

**EC1: Analysis in progress**
- Show loading state
- Poll for completion? Or rely on Firestore real-time updates?
- **Decision: Use Firestore real-time listener - updates automatically when analysis completes**

**EC2: Partial analysis (some documents exist, others don't)**
- If vocabulary exists but pronunciation doesn't → show vocabulary only
- If error exists → show error state
- **Decision: Error takes precedence. If any analysis exists, show what's available**

**EC3: Empty vocabulary (no content words found)**
- If vocabulary.words is empty array
- Show message: "No vocabulary words detected"
- Still show romanization if available

**EC4: Very long lyrics (> 100 lines)**
- Vocabulary list may be very long (> 500 words)
- **Decision: Use virtualized list (FlatList) for vocabulary bottom sheet**

**EC5: Lyrics deleted (copyright protection)**
- Lyrics field is deleted after analysis
- Need to fetch lyrics on-demand from Genius
- **Decision: Keep existing fetchLyrics logic - it fetches from Genius every time**

### 6.2 Performance Considerations

**P1: Firestore reads**
- Analysis subcollection has 4 documents (tokenization, vocabulary, grammar, pronunciation)
- Each screen load = 4 reads
- **Optimization: Load only vocabulary + pronunciation for v1 (skip tokenization + grammar)**

**P2: Large data payloads**
- Tokenization document may have 500+ tokens
- **Decision: Don't load tokenization for v1 - only load when needed for future features**

**P3: Real-time listener cleanup**
- Unsubscribe from Firestore listeners when component unmounts
- **Decision: Use useEffect cleanup function**

---

## 7. Out of Scope (Future Phases)

### Phase 2A.2 (Future)
- Dictionary definitions for vocabulary words
- Difficulty levels (beginner/intermediate/advanced)
- Add to flashcard feature
- Word-level click interaction

### Phase 2B (Future)
- Grammar pattern explanations
- Example sentences for patterns
- Line-by-line grammar breakdown

### Phase 2C (Future)
- Semantic analysis
- Cultural context
- Emotion tone visualization

---

## 8. Testing Checklist

### Manual Testing

- [ ] Korean song with complete analysis loads correctly
- [ ] Romanization toggle shows/hides romanization
- [ ] Vocabulary list displays all words
- [ ] POS filter works (nouns only, verbs only, etc.)
- [ ] Vocabulary sorted by frequency (descending)
- [ ] Analysis loading state shows while processing
- [ ] Analysis error state shows error message
- [ ] Non-Korean song shows "not available" message
- [ ] Lyrics without analysis show plain text

### Edge Case Testing

- [ ] Song with no vocabulary words (empty list)
- [ ] Song with very long lyrics (> 100 lines)
- [ ] Song with bilingual lyrics (Korean + English)
- [ ] Analysis fails → error document exists
- [ ] Partial analysis (only some documents exist)

---

## 9. Metrics & Success Criteria

**Phase 2A.1 Success Metrics:**

1. **Adoption:**
   - 70%+ of users view analysis for at least 1 Korean song
   - 50%+ of users toggle romanization at least once

2. **Engagement:**
   - Users spend 30+ seconds viewing vocabulary list
   - Users view vocabulary for 30%+ of Korean songs

3. **Technical:**
   - Analysis data loads in < 1 second
   - No crashes when viewing analysis
   - Firestore reads < 5 per screen load

---

## 10. Implementation Plan

### Step 1: Create `useAnalysis` hook
- Fetch analysis subcollection from Firestore
- Handle loading/error states
- Use real-time listeners for live updates

### Step 2: Create AnalysisStatusBanner component
- Show status (loading/complete/error/none)
- Display word count, pattern count
- Romanization + Vocabulary buttons

### Step 3: Implement romanization toggle
- Load pronunciation data
- Display romanization below each line
- Toggle on/off

### Step 4: Create VocabularyBottomSheet component
- Full-screen bottom sheet
- Display vocabulary list (grouped by POS)
- Filter by part of speech
- Sort by frequency

### Step 5: Handle error states
- Display error message from Firestore
- Show retry button
- Fallback to plain lyrics

### Step 6: Testing & polish
- Test with real Korean songs
- Handle edge cases
- Polish UI/UX

---

## 11. Dependencies

- React Native Bottom Sheet library (for vocabulary panel)
  - `@gorhom/bottom-sheet` - Good option
  - Or build custom modal

- Firestore real-time listeners
  - Already available via Firebase SDK

---

## 12. Open Questions

1. **Should we show grammar patterns in v1?**
   - Leaning NO - focus on vocabulary + romanization first
   - Add grammar in Phase 2A.2

2. **Should we cache analysis data locally?**
   - Leaning NO - Firestore caching is sufficient
   - May add AsyncStorage cache in future if performance issues

3. **Should vocabulary bottom sheet be full-screen or half-screen?**
   - Leaning FULL-SCREEN - easier to browse long lists
   - Can add "minimize" button

4. **Should we show tokenization data?**
   - Leaning NO for v1 - too technical for learners
   - May add "advanced view" toggle in future
