Fleshed Out Flow & Architecture Plan

  Core User Flow (Based on Your Brain Dump)

  1. User taps "Choose Song" button (Dashboard)
     ↓
  2. Song Selection Screen
     - Search songs via Spotify API
     - Display results (title, artist, album art)
     ↓
  3. User selects a song
     ↓
  4. Language Validation (Client-side +
  Server-side)
     - Use free library (franc, cld3) to detect
  lyrics language
     - Compare with user's target language
     ↓
  5. If validation passes → Generate Vocabulary
  Syllables
     - Firebase Function receives: song lyrics +
  currentProfile + goals
     - AI generates vocabulary list (JSON format)
     - Store in Firestore
     ↓
  6. Navigate to Lyrics Screen
     - Display full lyrics
     - Highlight generated vocabulary
     - [Future] Sync with music playback
     - [Future] Text-to-speech for pronunciation

  ---
  Tech Stack Recommendations

  1. Music API: Spotify Web API ✅ (Recommended)

  Why Spotify:
  - Free tier available with reasonable rate
  limits (no cost for song search/metadata)
  - Best documentation and most mature API
  - Geographic availability: Global (unlike some
  competitors)
  - No lyrics in API (but this is fine - see
  lyrics solution below)
  - OAuth 2.0 for authentication (we can use
  Authorization Code Flow)

  Alternative Considered:
  - YouTube Music API: No official API (requires
  unofficial wrappers)
  - Apple Music API: Requires Apple Developer
  membership ($99/year)

  Rate Limits:
  - 180 requests/minute (sufficient for MVP)
  - Can upgrade if needed

  Implementation:
  // Firebase Functions (backend)
  - spotifyAuth: Get access token (Client
  Credentials Flow)
  - searchSongs: Search tracks by query
  - getSongDetails: Get track metadata (title,
  artist, album, duration)

  // React Native (frontend)
  - SpotifyService: Wrapper for API calls
  - Use expo-auth-session for OAuth if
  user-specific features needed

  ---
  2. Lyrics Extraction: Genius API + Web Scraping 
  ✅ (Recommended)

  Why Genius:
  - Free API for song search and metadata
  - Web scraping for actual lyrics (legal gray
  area, but common practice)
  - Language metadata sometimes available
  - Most comprehensive lyrics database

  Alternative Libraries:
  - lyrics-finder (npm): Free, uses multiple
  sources
  - genius-lyrics-api (npm): Wrapper around Genius
  - Musixmatch: Paid API ($200-500/month for
  commercial use)

  Implementation:
  // Firebase Functions (backend)
  - getLyrics(songTitle, artist):
    1. Search Genius API for song ID
    2. Scrape lyrics from Genius webpage
    3. Return plain text lyrics

  // Rate Limits: Not officially documented, but 
  ~100 requests/hour is safe

  Copyright Considerations:
  - Display only (non-commercial use falls under
  fair use)
  - Do NOT store full lyrics in database (store
  reference only)
  - Attribute source (show "Lyrics from Genius" in
   UI)

  ---
  3. Language Validation: franc Library ✅ 
  (Recommended)

  Why franc:
  - Free & open-source
  - 165+ languages supported
  - Works client-side (React Native) and
  server-side (Node.js)
  - Fast (<10ms for typical lyrics)
  - Confidence scores (reliability indicator)

  Alternative:
  - cld3 (Google's Compact Language Detector):
  More accurate but larger bundle size
  - AI-based detection (Claude/GPT): Overkill +
  costs money

  Implementation:
  // Client-side validation (fast feedback)
  import franc from 'franc';

  const detectLanguage = (lyrics: string): {
  language: string; confidence: number } => {
    const detected = franc(lyrics, { minLength:
  100 });
    // franc returns ISO 639-3 codes (e.g., 'kor',
   'cmn', 'jpn', 'spa')

    // Map to our LanguageCode
    const langMap = {
      'kor': 'ko',
      'cmn': 'zh',
      'jpn': 'ja',
      'spa': 'es'
    };

    return {
      language: langMap[detected] || 'unknown',
      confidence: getConfidenceScore(detected) // 
  franc provides this
    };
  };

  // Validation logic
  const validateSongLanguage = (
    lyrics: string,
    targetLanguage: LanguageCode
  ): { valid: boolean; detected: string;
  confidence: number } => {
    const { language, confidence } =
  detectLanguage(lyrics);

    return {
      valid: language === targetLanguage &&
  confidence > 0.7,
      detected: language,
      confidence
    };
  };

  Edge Cases to Handle:
  1. Bilingual songs: Allow if confidence > 0.5
  for target language (show warning)
  2. Instrumental/no lyrics: Fail validation
  gracefully
  3. Wrong language detected: Allow user override
  (with warning)

  ---
  4. Vocabulary Generation: Claude via Firebase 
  Functions ✅ (Recommended)

  Why Claude (via Anthropic API):
  - Already using in onboarding (consistency)
  - Better at structured output (JSON) than
  GPT-3.5
  - Context window (200k tokens) can handle long
  lyrics
  - Cost: ~$3 per 1M input tokens (very cheap for
  lyrics)

  Prompt Design:
  // Firebase Function: generateVocabulary
  interface VocabularyRequest {
    lyrics: string;
    currentProfile: string; // AI diagnosis from 
  onboarding
    goals: string[];        // User's learning 
  goals
    targetLanguage: LanguageCode;
    proficiencyLevel: string; // e.g., "beginner",
   "intermediate"
  }

  const prompt = `
  You are a language learning expert. Extract 
  vocabulary from these song lyrics that would be 
  valuable for this learner.

  TARGET LANGUAGE: ${targetLanguage}
  LEARNER PROFILE:
  ${currentProfile}

  LEARNING GOALS:
  ${goals.join('\n')}

  SONG LYRICS:
  ${lyrics}

  Extract 20-30 vocabulary items (words or short 
  phrases) that:
  1. Match the learner's proficiency level
  2. Are relevant to their goals
  3. Are commonly used or culturally significant
  4. Appear in the lyrics

  For each item, provide:
  - word: The original word/phrase in target 
  language
  - translation: English translation
  - context: The line from the lyrics where it 
  appears
  - difficulty: "beginner", "intermediate", or 
  "advanced"
  - partOfSpeech: noun, verb, adjective, etc.
  - culturalNote: (optional) Brief cultural 
  context

  Return ONLY valid JSON in this format:
  {
    "vocabulary": [
      {
        "word": "사랑해",
        "translation": "I love you",
        "context": "나 너를 사랑해",
        "difficulty": "beginner",
        "partOfSpeech": "verb",
        "culturalNote": "Common expression in 
  K-pop"
      }
    ]
  }
  `;

  // Response handling
  const response = await
  anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  // Parse JSON from response
  const vocabularyData =
  JSON.parse(response.content[0].text);

  Output Format (for debugging/experimenting):
  {
    "vocabulary": [
      {
        "word": "string",
        "translation": "string",
        "context": "string",
        "difficulty": "beginner" | "intermediate"
  | "advanced",
        "partOfSpeech": "noun" | "verb" |
  "adjective" | "adverb" | "phrase",
        "culturalNote": "string (optional)"
      }
    ],
    "metadata": {
      "totalWords": number,
      "byDifficulty": {
        "beginner": number,
        "intermediate": number,
        "advanced": number
      }
    }
  }

  ---
  5. Data Model Extensions

  // src/types/music.ts (NEW FILE)
  import { Timestamp } from 'firebase/firestore';
  import { LanguageCode } from './onboarding';

  /**
   * Extended song data with lyrics and vocabulary
   */
  export interface Song {
    id: string;                 // Spotify track 
  ID
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;          // URL to album 
  cover
    duration?: number;          // milliseconds
    spotifyUri?: string;        // 
  spotify:track:xxxxx
    previewUrl?: string;        // 30s preview URL
   from Spotify

    // Lyrics data
    lyricsSource: 'genius' | 'manual' | 'none';
    geniusId?: string;          // Reference to 
  Genius song ID (don't store full lyrics)
    lyricsLanguage: LanguageCode;
    lyricsConfidence: number;   // 0-1 from 
  language detection

    // Metadata
    addedAt: Timestamp;
    language: LanguageCode;     // User's target 
  language
  }

  /**
   * Generated vocabulary for a song
   */
  export interface SongVocabulary {
    songId: string;             // References 
  Song.id
    userId: string;
    language: LanguageCode;

    vocabulary: VocabularyItem[];

    generatedAt: Timestamp;
    generatedBy: 'claude' | 'gpt'; // AI provider 
  used
    profileSnapshot: string;    // Snapshot of 
  currentProfile at generation time
  }

  export interface VocabularyItem {
    id: string;                 // Auto-generated
    word: string;
    translation: string;
    context: string;            // Line from 
  lyrics
    difficulty: 'beginner' | 'intermediate' |
  'advanced';
    partOfSpeech: string;
    culturalNote?: string;

    // Learning progress (for Feature 4 
  integration)
    learned: boolean;
    masteryLevel: number;       // 0-5 (spaced 
  repetition)
    lastReviewedAt?: Timestamp;
    nextReviewAt?: Timestamp;
  }

  // Update UserLanguage in onboarding.ts
  export interface UserLanguage {
    // ... existing fields
    currentSong?: CurrentSong;

    // NEW: Song history
    songs?: string[];           // Array of Song 
  document IDs
  }

  Firestore Collections:
  users/{uid}/
    └─ languages: UserLanguage[]

  songs/{songId}/                    # Song
  metadata (shared across users)
    └─ id, title, artist, etc.

  userSongs/{userId}/songs/{songId}/ #
  User-specific song data
    └─ vocabulary: SongVocabulary
    └─ progress: learning progress

  ---
  Implementation Plan (Phased Approach)

  Phase 1: Song Selection & Validation (MVP) 🎯

  Goal: Get song selection working end-to-end

  Tasks:
  1. Set up Spotify API integration
    - Create Spotify Developer account
    - Implement OAuth flow in Firebase Functions
    - Create searchSongs and getSongDetails
  functions
  2. Build Song Selection Screen
    - Search input
    - Results list (title, artist, album art)
    - Selection handling
  3. Implement lyrics extraction
    - Integrate Genius API
    - Web scraping fallback
    - Error handling (no lyrics found)
  4. Add language validation
    - Integrate franc library
    - Client-side validation (fast feedback)
    - Server-side validation (security)
    - User override option
  5. Update data models
    - Create Song interface
    - Extend Firestore schema
    - Update CurrentSong to reference full Song
  document

  Acceptance Criteria:
  - ✅ User can search for songs
  - ✅ User can select a song
  - ✅ Lyrics are fetched automatically
  - ✅ Wrong-language songs are rejected with
  clear error
  - ✅ Selected song appears in Dashboard

  ---
  Phase 2: Vocabulary Generation 🧠

  Goal: AI-powered vocabulary extraction

  Tasks:
  1. Create generateVocabulary Firebase Function
    - Accept lyrics + profile + goals
    - Call Claude API with structured prompt
    - Parse and validate JSON response
    - Store in Firestore
  2. Build Lyrics Screen (basic)
    - Display full lyrics (scrollable)
    - Highlight vocabulary words
    - Tap word → show translation modal
  3. Loading states
    - Show "Generating vocabulary..." spinner
    - Handle generation failures gracefully
  4. Debugging tools
    - Admin panel to view raw JSON output
    - Retry mechanism for failed generations

  Acceptance Criteria:
  - ✅ Vocabulary is generated within 10 seconds
  - ✅ JSON output is valid and parseable
  - ✅ 20-30 relevant words extracted
  - ✅ Words match user's proficiency level
  - ✅ Lyrics screen displays vocabulary

  ---
  Phase 3: Enhanced Lyrics Experience 🎵

  Goal: Make lyrics interactive and engaging

  Tasks:
  1. Music playback integration
    - Use Spotify preview URL (30s clips)
    - Implement react-native-track-player or Expo
  AV
    - Play/pause controls
  2. Synchronized lyrics (if time permits)
    - Research synced lyrics sources (LRClib,
  Musixmatch)
    - Highlight current line during playback
    - Auto-scroll to current position
  3. Text-to-speech for pronunciation
    - Integrate expo-speech or native TTS
    - Tap word → hear pronunciation
    - Adjustable speed
  4. UI polish
    - Beautiful lyrics typography
    - Smooth scrolling
    - Dark mode support

  Acceptance Criteria:
  - ✅ User can play song preview
  - ✅ (Optional) Lyrics sync with playback
  - ✅ User can hear word pronunciation
  - ✅ UI is polished and intuitive

  ---
  Open Questions to Clarify

  Before formalizing requirements, we need to
  decide:

  1. Multiple Songs per Language?

  - Option A: One song at a time (simpler, MVP)
    - User can change song anytime
    - Vocabulary history is lost when switching
  - Option B: Multiple songs (feature-complete)
    - User builds a playlist
    - All vocabulary is aggregated
    - Requires playlist UI

  Recommendation: Start with Option A, add Option
  B in Phase 4

  2. Vocabulary Learning Mode

  Do we need a separate "Study Mode" for
  vocabulary, or just display in lyrics?
  - Display only: User learns by reading lyrics
  - Quiz mode: Flashcards, fill-in-the-blank
  exercises (Feature 4 integration)

  Recommendation: Display only for MVP, quiz mode
  in Feature 4

  3. Offline Support

  Should lyrics/vocabulary be available offline?
  - Yes: Cache in AsyncStorage
  - No: Always fetch from Firestore

  Recommendation: No for MVP (simplify), add in
  Phase 4

  4. Song Recommendations

  Should we suggest songs based on proficiency?
  - Requires curated song database
  - Could use AI to recommend (expensive)

  Recommendation: No for MVP, manual search only

  ---
  Cost Estimates

  Spotify API: Free (180 req/min sufficient)
  Genius API: Free (web scraping for lyrics)
  Language Detection (franc): Free
  Claude API: ~$0.01 per vocabulary generation
  (assuming 5000 tokens)
  - 100 users × 5 songs each = $5/month
  Firebase Functions: ~$0.40 per 1M invocations
  (negligible)

  Total MVP cost: < $10/month for 100 active users

  ---
  Tech Stack Summary

  | Component          | Technology            |
  Cost       | Rationale                      |
  |--------------------|-----------------------|--
  ----------|--------------------------------|
  | Music API          | Spotify Web API       |
  Free       | Best docs, global availability |
  | Lyrics             | Genius API + scraping |
  Free       | Most comprehensive database    |
  | Language Detection | franc (npm)           |
  Free       | Fast, accurate, 165+ languages |
  | Vocabulary AI      | Claude (Anthropic)    |
  ~$0.01/gen | Already using, great at JSON   |
  | Music Playback     | Expo AV               |
  Free       | Built-in, simple API           |
  | TTS                | expo-speech           |
  Free       | Native TTS engines             |
  | Backend            | Firebase Functions    |
  ~$0.40/1M  | Existing infrastructure        |
  | Database           | Firestore             |
  Existing   | Current data store             |

  ---
  Potential Issues & Mitigations

  1. Lyrics Copyright

  Risk: Cease & desist from Genius/lyrics
  providers
  Mitigation:
  - Display only (fair use)
  - Don't store full lyrics
  - Attribute source
  - Consider paid Musixmatch API if scaling

  2. Language Detection Accuracy

  Risk: Songs with multiple languages or slang
  Mitigation:
  - Allow user override
  - Show confidence score
  - Learn from user corrections

  3. Spotify Rate Limits

  Risk: 180 req/min may not be enough at scale
  Mitigation:
  - Cache song metadata in Firestore
  - Implement request queuing
  - Upgrade to higher tier if needed

  4. AI Vocabulary Quality

  Risk: Generated vocabulary may not match user
  needs
  Mitigation:
  - Allow user to remove/add words manually
  - Collect feedback ("Was this vocabulary
  helpful?")
  - Refine prompts based on feedback

  ---
  Next Steps

  1. Review this plan - Any changes/concerns?
  2. Answer open questions (multiple songs?
  offline support?)
  3. Formalize requirements following
  requirement-playbook.md
  4. Create architecture document following
  technical-requirement-playbook.md
  5. Begin Phase 1 implementation