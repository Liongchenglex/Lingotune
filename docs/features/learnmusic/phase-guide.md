# Learn Music - Phase Implementation Guide

**Last Updated:** 2026-01-23
**Current Phase:** Phase 2A.1 ✅ Complete

---

## Phase Overview

This document tracks the phased implementation of the Learn Music feature. Each phase builds incrementally toward a complete language learning system.

```
Phase 1: MVP Foundation        ✅ COMPLETE
Phase 2A: Korean Analysis      ✅ COMPLETE (2A.1 done)
Phase 2A.2: Dictionary         🔜 NEXT
Phase 2B: Grammar Lessons      📋 PLANNED
Phase 2C: Flashcards & SRS     📋 PLANNED
```

---

## Phase 1: MVP Foundation ✅ COMPLETE

**Goal:** Basic song selection and lyrics display without analysis

**Completed:** 2026-01-13

### Features Implemented

- [x] Song search and selection (`SongSelectionScreen`)
- [x] Hardcoded song database (MVP - no Genius API)
- [x] Language validation (basic detection)
- [x] Plain lyrics display (`LyricsScreen`)
- [x] Firebase Functions for lyrics fetching
- [x] Firestore song storage

### Technical Decisions

- **Hardcoded songs:** Avoid Genius API complexity in MVP
- **Client-side language detection:** Fast but not perfect (acceptable for MVP)
- **No analysis yet:** Focus on core flow first

### Files Created

**Frontend:**
- `src/screens/music/SongSelectionScreen.tsx`
- `src/screens/music/LyricsScreen.tsx`
- `src/utils/languageDetection.ts`

**Backend:**
- `functions/src/fetchLyrics.ts`
- `functions/src/searchSongs.ts`
- `functions/data/songs.json`

**Schema:**
- `/songs/{songId}` - Song metadata + lyrics

### Deliverables

✅ Users can select Korean songs
✅ Users can view plain Korean lyrics
✅ Basic error handling and loading states

---

## Phase 2A: Korean Lyrics Analysis ✅ COMPLETE

**Goal:** Automated Korean text analysis with Cloud Run Python service

**Completed:** 2026-01-23

### Phase 2A.0: Python Analysis Pipeline ✅

**Completed:** 2026-01-14

#### Features Implemented

- [x] Cloud Run service setup (Flask + KoNLPy)
- [x] Korean tokenization (morphological analysis)
- [x] Vocabulary extraction
- [x] Grammar pattern detection
- [x] Romanization generation
- [x] Firestore trigger for automatic analysis

#### Technical Components

**Python Service (`functions/python-cloudrun/`):**
- `main.py` - Flask app + Firestore integration
- `tokenizer.py` - KoNLPy Okt tokenizer
- `vocabulary.py` - Extract unique words
- `grammar.py` - Pattern detection
- `pronunciation.py` - Romanization (hangul-romanize)

**Firebase Functions:**
- `analyzeLyricsTrigger.ts` - Firestore onCreate trigger
  - Detects new songs
  - Calls Cloud Run service
  - Handles errors

**Firestore Schema:**
- `/songs/{songId}/analysis/tokenization`
- `/songs/{songId}/analysis/vocabulary`
- `/songs/{songId}/analysis/grammar`
- `/songs/{songId}/analysis/pronunciation`

#### Key Decisions

1. **Cloud Run over Firebase Functions:**
   - Python libraries (KoNLPy) not available in Node.js
   - Heavy compute workload better suited for Cloud Run
   - Easy horizontal scaling

2. **Delete lyrics after analysis:**
   - Copyright protection
   - Storage cost reduction
   - Analysis data sufficient for learning

3. **Firestore subcollection:**
   - Organized data structure
   - Real-time updates
   - Granular security rules

### Phase 2A.1: Display Analysis Results ✅

**Completed:** 2026-01-23

#### Features Implemented

- [x] Real-time analysis data fetching (`useAnalysis` hook)
- [x] Interactive tokenized lyrics display
- [x] Vocabulary word details bottom sheet
- [x] Grammar pattern explanations
- [x] Per-line romanization with toggle
- [x] Analysis status banner
- [x] Graceful fallback to plain lyrics

#### Technical Components

**Frontend Components:**
- `src/hooks/useAnalysis.ts` - Real-time Firestore subscription
- `src/components/music/TokenizedLyrics.tsx` - Interactive token display
- `src/components/music/TokenDetailBottomSheet.tsx` - Vocabulary details
- `src/components/music/GrammarPatternBottomSheet.tsx` - Grammar explanations
- `src/components/music/AnalysisStatusBanner.tsx` - Progress indicator

**Key Features:**
- **Token Display:**
  - Underlined = vocabulary word
  - Regular = functional morpheme
  - Tap token → vocabulary details
- **Grammar Indicators:**
  - ⓘ icon on lines with patterns
  - Tap icon → grammar explanations
- **Romanization:**
  - Per-line display (not per-token)
  - Individual hide/show toggles
  - Accounts for Korean sound linking (연음)

#### Token Interaction Flow

```
User taps "사랑" (underlined token)
    ↓
TokenDetailBottomSheet opens
    ├─ Korean word: 사랑
    ├─ POS: Noun
    ├─ Frequency: 8 times
    ├─ Definition: 애정; 좋아하는 감정 / love; affection
    └─ Found in lines: 1, 4, 6, 13

User taps ⓘ icon
    ↓
GrammarPatternBottomSheet opens
    ├─ Pattern 1: "을/를 좋아하다"
    │   └─ Express liking or preference (beginner)
    └─ Pattern 2: "V + 고 싶다"
        └─ Want to do something (beginner)

User taps "🙈 Hide" on romanization
    ↓
Romanization for that line disappears
(Other lines unaffected)
```

#### Data Relationship

```
Tokens (Base Unit)
   ├─> Vocabulary (Aggregated by word)
   │     └─ Used for: Underlining, bottom sheet
   │
   ├─> Grammar (Detected patterns across tokens)
   │     └─ Used for: ⓘ icon, pattern explanations
   │
   └─> Pronunciation (Per line, not per token)
         └─ Used for: Romanization display below line
```

### Security Improvements (Phase 2A)

**Implemented:** 2026-01-23

#### Features Added

- [x] Server-side rate limiting (Firestore)
- [x] Input size validation (50KB lyrics, 100 char song IDs)
- [x] Song quotas (50 per language)
- [x] Error message sanitization
- [x] Firestore security rules for rate limits
- [x] Cloud Run IAM verification checklist

#### Rate Limiting

**Architecture:**
- Server-side enforcement using Firestore atomic transactions
- Cannot be bypassed even if app is reverse-engineered
- Per-user, per-action limits

**Limits:**
| Action | Max Requests | Time Window |
|--------|-------------|-------------|
| fetchLyrics | 10 | 1 minute |
| searchSongs | 20 | 1 minute |
| saveSong | 5 | 1 minute |

**Implementation:**
- `functions/src/rateLimiter.ts` - Core logic
- `fetchLyrics.ts` - Integration
- `/rateLimits/{userId}/actions/{action}` - Firestore collection

#### Security Files

- `security-review.md` - Full security audit
- `CLOUD-RUN-VERIFICATION-NEEDED.md` - IAM checklist

### Phase 2A Deliverables

✅ **Analysis Pipeline:**
- Automated Korean text analysis
- Real-time Firestore updates
- Error handling and retry logic

✅ **Interactive UI:**
- Tappable tokens with vocabulary details
- Grammar pattern indicators and explanations
- Per-line romanization with toggles
- Analysis progress feedback

✅ **Security:**
- Rate limiting (10 requests/min)
- Input validation
- Song quotas (50/language)
- Error sanitization
- Copyright protection (lyrics deleted)

---

## Phase 2A.2: Dictionary Integration 🔜 NEXT

**Goal:** Real dictionary definitions and enhanced vocabulary data

**Status:** Planned

### Planned Features

- [ ] Korean-English dictionary API integration
- [ ] Fetch real definitions for vocabulary words
- [ ] Add pronunciation audio (TTS or native recordings)
- [ ] Display example sentences
- [ ] Add word difficulty ratings
- [ ] Implement fallback for missing definitions

### Technical Approach

**API Options:**
1. **Naver Dictionary API** (preferred)
   - Comprehensive Korean-English definitions
   - Example sentences included
   - Official API with good coverage

2. **Open Korean Dictionary**
   - Free alternative
   - Community-driven
   - May have gaps in coverage

**Implementation Plan:**

1. **Add dictionary function:**
   ```typescript
   // functions/src/fetchDefinition.ts
   export const fetchDefinition = functions.https.onCall(
     async (data: { word: string, pos: string }) => {
       // Call Naver/Open API
       // Return definition, examples, audio URL
     }
   );
   ```

2. **Update vocabulary extraction:**
   ```python
   # vocabulary.py
   def extract_vocabulary(tokens):
       words = []
       for word in unique_words:
           definition = await fetch_definition(word.text, word.pos)
           words.append({
               'word': word.text,
               'definition': definition,
               # ...
           })
   ```

3. **Enhanced bottom sheet:**
   - Add audio playback button
   - Display example sentences
   - Show difficulty badge

### Files to Modify

**Backend:**
- `functions/python-cloudrun/vocabulary.py` - Add API calls
- `functions/src/fetchDefinition.ts` - New function (optional)

**Frontend:**
- `src/components/music/TokenDetailBottomSheet.tsx` - Enhanced UI
- Update `VocabularyWord` interface in `useAnalysis.ts`

### Acceptance Criteria

- [ ] Vocabulary words have real Korean + English definitions
- [ ] Example sentences shown for each word
- [ ] Audio pronunciation available (if API supports)
- [ ] Fallback message for missing definitions
- [ ] Loading states for definition fetching

---

## Phase 2B: Grammar Lessons 📋 PLANNED

**Goal:** Detailed grammar explanations and learning resources

**Status:** Planned for Q2 2026

### Planned Features

- [ ] Grammar pattern library (stored in Firestore)
- [ ] Detailed explanations with examples
- [ ] Formation rules and usage notes
- [ ] Interactive exercises
- [ ] Common mistakes section
- [ ] Progression tracking

### Technical Approach

**Grammar Library Structure:**
```typescript
/grammarPatterns/{patternId}
{
  id: "ko-grammar-001",
  pattern: "을/를 좋아하다",
  level: "beginner",
  category: "verbs",
  explanation: {
    ko: "...",
    en: "Express liking or preference..."
  },
  formation: [
    "Noun + 을/를 + 좋아하다",
    "Use 을 after consonant, 를 after vowel"
  ],
  examples: [
    { korean: "나는 음악을 좋아해요", english: "I like music" },
    // ...
  ],
  exercises: [
    // Practice questions
  ]
}
```

**UI Flow:**
1. User taps ⓘ icon on lyrics
2. Grammar bottom sheet shows detected patterns
3. User taps "Learn More" on a pattern
4. Navigate to detailed grammar lesson screen
5. Show explanation, examples, exercises

### Files to Create

**Frontend:**
- `src/screens/music/GrammarLessonScreen.tsx`
- `src/components/music/GrammarExercise.tsx`

**Backend:**
- Grammar pattern library (Firestore collection)
- Admin tool to add/edit grammar patterns

### Acceptance Criteria

- [ ] Comprehensive grammar pattern library
- [ ] Detailed lesson screens
- [ ] Interactive exercises
- [ ] Track user progress on patterns
- [ ] Link from lyrics to lessons

---

## Phase 2C: Flashcards & Spaced Repetition 📋 PLANNED

**Goal:** Long-term vocabulary retention through SRS

**Status:** Planned for Q3 2026

### Planned Features

- [ ] Create flashcards from vocabulary
- [ ] Spaced repetition algorithm (SM-2 or similar)
- [ ] Daily review reminders
- [ ] Progress tracking
- [ ] Streak counting
- [ ] Audio pronunciation on flashcards

### Technical Approach

**Flashcard Structure:**
```typescript
/users/{userId}/flashcards/{cardId}
{
  word: "사랑",
  reading: "sarang",
  definition: { ko: "...", en: "love" },
  sourceSongId: "song-ko-001",
  sourceLineIndex: 3,

  // SRS data
  easeFactor: 2.5,
  interval: 1,  // days
  repetitions: 0,
  nextReviewDate: Timestamp,
  lastReviewed: Timestamp,

  // Stats
  correctCount: 0,
  incorrectCount: 0,
  createdAt: Timestamp
}
```

**SRS Algorithm (SM-2):**
```typescript
function calculateNextReview(
  quality: number,  // 0-5 rating
  easeFactor: number,
  interval: number,
  repetitions: number
): { easeFactor, interval, repetitions } {
  // SM-2 algorithm implementation
  // Returns updated SRS parameters
}
```

### UI Flow

1. **Create Flashcard:**
   - User taps "Add to Flashcards" in TokenDetailBottomSheet
   - Card created with initial SRS parameters
   - Confirmation shown

2. **Daily Review:**
   - Home screen shows: "5 cards due today"
   - User navigates to review screen
   - Shows front (Korean word + context)
   - User flips to see definition
   - Rates difficulty (1-5)
   - Next card based on SRS

3. **Progress Tracking:**
   - Daily/weekly review stats
   - Vocabulary size growth chart
   - Streak counter
   - Mastery levels

### Files to Create

**Frontend:**
- `src/screens/flashcards/FlashcardReviewScreen.tsx`
- `src/screens/flashcards/FlashcardStatsScreen.tsx`
- `src/components/flashcards/FlashcardComponent.tsx`
- `src/utils/srsAlgorithm.ts`

**Backend:**
- `functions/src/flashcardSync.ts` - Sync reviews to Firestore
- Scheduled function for daily review reminders

**Firestore:**
- `/users/{userId}/flashcards/{cardId}`
- `/users/{userId}/reviewStats/daily`

### Acceptance Criteria

- [ ] Create flashcards from vocabulary
- [ ] SRS algorithm correctly spaces reviews
- [ ] Daily review workflow
- [ ] Progress tracking and stats
- [ ] Streak tracking
- [ ] Audio playback on cards

---

## Future Phases (Beyond Phase 2C)

### Phase 3: Multi-Language Support

- Expand beyond Korean to Japanese, Chinese, Spanish
- Language-specific analyzers
- Shared component architecture

### Phase 4: Social Features

- Share favorite songs
- Compare progress with friends
- Community-contributed grammar lessons

### Phase 5: Advanced Learning

- Listening comprehension exercises
- Speaking practice with speech recognition
- Writing practice with AI feedback

---

## Phase Transition Checklist

Before moving to the next phase, ensure:

### Phase Completion Criteria

- [ ] All planned features implemented and tested
- [ ] Security review completed
- [ ] Documentation updated (requirements.md, technical-implementation.md)
- [ ] User acceptance testing passed
- [ ] Performance benchmarks met
- [ ] Deployed to production
- [ ] Monitoring and analytics configured

### Phase 2A.1 → Phase 2A.2 Transition

Current status: ✅ Phase 2A.1 complete

**Ready for Phase 2A.2:**
- ✅ All Phase 2A.1 features implemented
- ✅ Security improvements deployed
- ✅ Documentation consolidated
- ✅ Deployed to production (staging)
- ⏭️ **Next:** Dictionary API integration

---

## Quick Reference

### Current State (2026-01-23)

**✅ Working Features:**
- Song selection and storage
- Automatic Korean lyrics analysis
- Interactive tokenized lyrics
- Vocabulary word details
- Grammar pattern detection
- Per-line romanization with toggles
- Rate limiting and security

**🔜 Coming Next (Phase 2A.2):**
- Real dictionary definitions
- Pronunciation audio
- Example sentences

**📋 Future (Phase 2B, 2C):**
- Detailed grammar lessons
- Flashcard system with SRS
- Progress tracking

### Key Metrics

| Metric | Phase 1 | Phase 2A.0 | Phase 2A.1 | Target 2A.2 |
|--------|---------|-----------|-----------|-------------|
| Songs Available | 15 | 15 | 15 | 30 |
| Analysis Speed | N/A | ~5s | ~5s | ~5s |
| Vocabulary Coverage | 0% | 100% | 100% | 100% (with defs) |
| User Interaction | View only | View only | Interactive | Enhanced |
| Learning Features | 0 | 0 | 3 (vocab, grammar, pronunciation) | 4 (+ audio) |

---

## Document Maintenance

**Update this document when:**
- Starting a new phase
- Completing a phase
- Making significant architectural changes
- Adding/removing planned features

**Owner:** Development Team
**Review Frequency:** At phase boundaries
**Last Review:** 2026-01-23 (Phase 2A.1 completion)
