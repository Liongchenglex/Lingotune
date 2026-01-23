# Learn with Music Feature - Requirements

---

## Status
- [x] Requirements gathering (brain dump phase)
- [x] Requirements refinement
- [x] Formal requirements complete - Phase 1
- [x] Requirements frozen - Phase 1 ✅
- [ ] Phase 2 requirements (deferred)

---

# PHASE 1: Song Selection & Validation (MVP)

## 1. Context & Intent

### Purpose
Enable users to learn vocabulary through music by selecting songs in their target language. This feature focuses on **song selection and validation only** - vocabulary generation is deferred to Phase 2.

### User Persona
- Language learners who have completed onboarding and have a `currentProfile`
- Users learning Korean, Chinese, Japanese, or Spanish
- Users who want engaging, culturally relevant vocabulary learning

### Problem Being Solved
Traditional vocabulary learning can be dry and disconnected from real-world usage. Learning through music:
- Provides authentic language exposure
- Connects vocabulary to cultural context
- Makes learning more engaging and memorable
- Allows learners to engage with content they already enjoy

### Non-Goals (Explicitly Out of Scope for Phase 1)
- ❌ Vocabulary generation (AI extraction) - **Phase 2**
- ❌ Lyrics display screen - **Phase 2**
- ❌ Music playback functionality - **Phase 3**
- ❌ Synced lyrics highlighting - **Phase 3**
- ❌ Text-to-speech pronunciation - **Phase 3**
- ❌ Multiple songs per language (playlist) - **Future**
- ❌ Song recommendations based on proficiency - **Future**
- ❌ Offline lyrics support - **Future**

---

## 2. Actual Flow (End-to-End)

### Happy Path
1. **User triggers song selection**
   - User taps "Choose Song" button in Dashboard music section
   - System navigates to Song Selection Screen

2. **User searches for song**
   - User enters search query (song title, artist, or both)
   - System validates input (min 2 characters)
   - Frontend calls Firebase Function `searchSongs`

3. **System fetches results from Spotify**
   - Firebase Function authenticates with Spotify API (Client Credentials Flow)
   - Searches Spotify catalog for matching tracks
   - Returns top 20 results with metadata (title, artist, album art, preview URL)

4. **User views and selects song**
   - Frontend displays search results in scrollable list
   - User taps desired song
   - System shows loading indicator "Fetching lyrics..."

5. **System fetches lyrics**
   - Frontend calls Firebase Function `fetchLyrics`
   - Function searches Genius API for song
   - Function scrapes lyrics from Genius webpage
   - Returns plain text lyrics

6. **System validates language**
   - Frontend runs `franc` language detection on lyrics
   - Checks if detected language matches user's target language
   - Calculates confidence score (0-1)

7. **Validation passes (confidence ≥ 0.7)**
   - System stores song metadata in Firestore: `songs/{songId}`
   - System updates `user.languages[].currentSong` with song reference
   - System shows success message: "Song added successfully!"
   - System navigates back to Dashboard
   - Dashboard displays selected song in music section

### Alternative Paths (Edge Cases)
See Section 8 & 9 for comprehensive edge case and failure handling.

---

## 3. Step-by-Step Behaviour (Deterministic)

### A. Song Selection Screen - Search

**Trigger**: User taps "Choose Song" button

1. Navigate to `SongSelectionScreen`
2. Display search input (placeholder: "Search for a song or artist...")
3. Wait for user input

**On user types**:
- If input length < 2: Show no results, disable search
- If input length ≥ 2: Enable search, show search icon
- Debounce input (500ms) to avoid excessive API calls

**On user submits search** (taps search icon or presses Enter):
1. Validate input: `searchQuery.trim().length >= 2`
   - If invalid: Show error "Please enter at least 2 characters"
   - If valid: Continue

2. Set loading state: `searching = true`
3. Call Firebase Function: `searchSongs({ query: searchQuery, limit: 20 })`

4. **On success** (200 response):
   - Parse response: `{ tracks: Song[] }`
   - If `tracks.length === 0`: Show empty state (see Section 8.1)
   - If `tracks.length > 0`: Display results list
   - Set `searching = false`

5. **On API failure** (see Section 9.1):
   - Handle Spotify API errors
   - Show user-friendly error message
   - Set `searching = false`

### B. Song Selection Screen - Results Display

**For each song in results**:
```
[Album Art] [Title]
           [Artist]
```

**On user taps song**:
1. Set selected song: `selectedSong = song`
2. Show confirmation dialog:
   - Title: "Confirm Selection"
   - Message: "{title} by {artist}"
   - Actions: "Cancel" | "Confirm"

3. **On Cancel**: Close dialog, return to results
4. **On Confirm**: Proceed to lyrics fetch (Step C)

### C. Lyrics Fetching

**Trigger**: User confirms song selection

1. Show loading overlay: "Fetching lyrics..."
2. Call Firebase Function: `fetchLyrics({ songId, title, artist })`

3. **On success** (200 response):
   - Parse response: `{ lyrics: string, source: 'genius' | 'manual', geniusId?: string }`
   - Proceed to language validation (Step D)

4. **On failure** (see Section 9.2):
   - Handle lyrics not found
   - Show error with options: "Try Another Song" | "Cancel"

### D. Language Validation

**Trigger**: Lyrics fetched successfully

1. Run language detection:
   ```typescript
   const result = detectLanguage(lyrics); // Uses franc library
   // Returns: { language: LanguageCode | 'unknown', confidence: number }
   ```

2. Get user's target language from context: `currentLanguage.languageCode`

3. **Validation logic**:
   ```
   IF result.language === 'unknown':
     → FAIL (see Section 9.3.1)

   IF result.language !== targetLanguage:
     → FAIL (see Section 9.3.2)

   IF result.confidence < 0.5:
     → FAIL with low confidence (see Section 9.3.3)

   IF result.confidence >= 0.5 AND result.confidence < 0.7:
     → WARN (see Section 8.4)

   IF result.confidence >= 0.7:
     → PASS (proceed to Step E)
   ```

### E. Song Storage & Navigation

**Trigger**: Language validation passed (confidence ≥ 0.7)

1. Prepare song data:
   ```typescript
   const song: Song = {
     id: spotifyTrackId,
     title: song.title,
     artist: song.artist,
     album: song.album,
     albumArt: song.albumArt,
     duration: song.duration,
     spotifyUri: song.spotifyUri,
     previewUrl: song.previewUrl,
     lyricsSource: 'genius',
     geniusId: geniusId,
     lyricsLanguage: result.language,
     lyricsConfidence: result.confidence,
     language: currentLanguage.languageCode,
     addedAt: Timestamp.now()
   };
   ```

2. **Firestore operations** (batched write):
   - Write song metadata: `songs/{songId}` ← `song`
   - Update user language:
     ```
     users/{uid}/languages[currentLanguageIndex].currentSong = {
       id: songId,
       title: song.title,
       artist: song.artist,
       addedAt: Timestamp.now()
     }
     ```
   - Update `lastUpdated` timestamp

3. Show success toast: "Song added successfully!"
4. Navigate back to Dashboard
5. Dashboard re-renders with new `currentSong` displayed

---

## 4. Sequence Diagram (Text-Based)

### Happy Path: Successful Song Selection

```
User → Dashboard: Tap "Choose Song"
Dashboard → SongSelectionScreen: Navigate

User → SongSelectionScreen: Enter search query "Dynamite BTS"
SongSelectionScreen → SongSelectionScreen: Validate (length ≥ 2)
SongSelectionScreen → Firebase: searchSongs({ query: "Dynamite BTS" })
Firebase → Spotify API: GET /v1/search?q=Dynamite+BTS&type=track
Spotify API → Firebase: 200 { tracks: [...] }
Firebase → SongSelectionScreen: { tracks: [...] }
SongSelectionScreen → User: Display results (20 songs)

User → SongSelectionScreen: Tap "Dynamite - BTS"
SongSelectionScreen → User: Show confirmation dialog
User → SongSelectionScreen: Tap "Confirm"

SongSelectionScreen → Firebase: fetchLyrics({ songId, title, artist })
Firebase → Genius API: GET /search?q=Dynamite BTS
Genius API → Firebase: { hits: [{ id: 123, url: "..." }] }
Firebase → Genius Web: Scrape lyrics from URL
Genius Web → Firebase: HTML with lyrics
Firebase → SongSelectionScreen: { lyrics: "...", source: "genius" }

SongSelectionScreen → franc: detectLanguage(lyrics)
franc → SongSelectionScreen: { language: "ko", confidence: 0.85 }
SongSelectionScreen → SongSelectionScreen: Validate (ko === ko, 0.85 ≥ 0.7) ✓

SongSelectionScreen → Firestore: Batch write (song + user.currentSong)
Firestore → SongSelectionScreen: Success
SongSelectionScreen → Dashboard: Navigate back
Dashboard → User: Show "Song added successfully!" + display song
```

### Failure Path: Lyrics Not Found

```
[... same as above until confirmation ...]

SongSelectionScreen → Firebase: fetchLyrics({ songId, title, artist })
Firebase → Genius API: GET /search?q=Song Title
Genius API → Firebase: 200 { hits: [] } (no results)
Firebase → SongSelectionScreen: 404 { error: "lyrics_not_found" }

SongSelectionScreen → User: Show error dialog
                            "We couldn't find lyrics for this song"
                            [Try Another Song] [Cancel]
```

### Failure Path: Wrong Language Detected

```
[... same as happy path until language detection ...]

SongSelectionScreen → franc: detectLanguage(lyrics)
franc → SongSelectionScreen: { language: "en", confidence: 0.92 }
SongSelectionScreen → SongSelectionScreen: Validate (en !== ko) ✗

SongSelectionScreen → User: Show error dialog
                            "This song is in English, not Korean"
                            "Detected with 92% confidence"
                            [Try Another Song] [Override (Advanced)]
```

---

## 5. Visual Flow

### Screen Flow
```
[Dashboard]
    ↓ (Tap "Choose Song")
[Song Selection Screen]
    ├─ Search Input
    ├─ Results List (20 songs)
    ↓ (Tap song → Confirm)
[Loading Overlay: "Fetching lyrics..."]
    ↓
[Language Validation] (automatic)
    ├─ PASS → [Success Toast] → [Dashboard] ✓
    ├─ FAIL → [Error Dialog] → [Song Selection Screen]
    └─ WARN → [Warning Dialog] → User chooses
```

### Song Selection Screen Layout
```
┌─────────────────────────────────────┐
│ ← Back        Song Selection        │
├─────────────────────────────────────┤
│ 🔍 Search for a song or artist...  │
├─────────────────────────────────────┤
│                                     │
│ Results (if searching)              │
│ ┌─────────────────────────────────┐ │
│ │ [IMG] Dynamite                  │ │
│ │       BTS                       │ │
│ ├─────────────────────────────────┤ │
│ │ [IMG] Boy With Luv (feat...)    │ │
│ │       BTS                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (Empty state if no results)         │
│ (Error state if API fails)          │
└─────────────────────────────────────┘
```

### Confirmation Dialog
```
┌─────────────────────────────────────┐
│ Confirm Selection                   │
├─────────────────────────────────────┤
│ [Album Art]                         │
│                                     │
│ Dynamite                            │
│ by BTS                              │
├─────────────────────────────────────┤
│        [Cancel]  [Confirm]          │
└─────────────────────────────────────┘
```

---

## 6. Inputs & Outputs

### Inputs

#### A. Song Search
**Required**:
- `searchQuery` (string): User's search input (min 2 chars, max 100 chars)

**Optional**:
- `limit` (number): Max results to return (default: 20, max: 50)

**Derived from context**:
- `userId` (string): From auth context
- `languageCode` (LanguageCode): From current language selection

#### B. Lyrics Fetch
**Required**:
- `songId` (string): Spotify track ID
- `title` (string): Song title (for Genius search)
- `artist` (string): Artist name (for Genius search)

**Optional**:
- `album` (string): Album name (improves search accuracy)

#### C. Language Validation
**Required**:
- `lyrics` (string): Plain text lyrics (min 50 chars)
- `targetLanguage` (LanguageCode): User's target language

### Outputs

#### A. searchSongs Response
**Success (200)**:
```typescript
{
  tracks: Array<{
    id: string;           // Spotify track ID
    title: string;
    artist: string;
    album: string;
    albumArt: string;     // URL to album cover (640x640)
    duration: number;     // milliseconds
    spotifyUri: string;   // spotify:track:xxxxx
    previewUrl: string | null; // 30s preview URL (may be null)
  }>;
  total: number;          // Total results available
}
```

**Failure (see Section 9.1)**:
```typescript
{
  error: 'api_unavailable' | 'rate_limit' | 'invalid_query' | 'network_error';
  message: string;        // User-friendly error message
  retryable: boolean;     // Can user retry?
}
```

#### B. fetchLyrics Response
**Success (200)**:
```typescript
{
  lyrics: string;         // Plain text lyrics (newlines preserved)
  source: 'genius';       // Source of lyrics
  geniusId: string;       // Genius song ID (for attribution)
  geniusUrl: string;      // URL to Genius page
}
```

**Failure (see Section 9.2)**:
```typescript
{
  error: 'lyrics_not_found' | 'api_unavailable' | 'scraping_failed';
  message: string;
  retryable: boolean;
}
```

#### C. Language Validation Result (Client-side)
```typescript
{
  valid: boolean;
  detected: LanguageCode | 'unknown';
  confidence: number;     // 0-1
  reason?: string;        // If invalid, why?
}
```

---

## 7. API Contracts & Payloads

### A. Firebase Function: `searchSongs`

**Endpoint**: `https://us-central1-{project}.cloudfunctions.net/searchSongs`
**Method**: POST (Callable Function)
**Auth**: Required (Firebase ID token)

**Request**:
```json
{
  "query": "Dynamite BTS",
  "limit": 20
}
```

**Response (Success - 200)**:
```json
{
  "tracks": [
    {
      "id": "0t1kP63rueHleOhQkYSXFY",
      "title": "Dynamite",
      "artist": "BTS",
      "album": "Dynamite",
      "albumArt": "https://i.scdn.co/image/ab67616d0000b273...",
      "duration": 199054,
      "spotifyUri": "spotify:track:0t1kP63rueHleOhQkYSXFY",
      "previewUrl": "https://p.scdn.co/mp3-preview/..."
    }
  ],
  "total": 150
}
```

**Response (Error - 4xx/5xx)**:
```json
{
  "error": "api_unavailable",
  "message": "Spotify API is temporarily unavailable. Please try again later.",
  "retryable": true
}
```

### B. Firebase Function: `fetchLyrics`

**Endpoint**: `https://us-central1-{project}.cloudfunctions.net/fetchLyrics`
**Method**: POST (Callable Function)
**Auth**: Required (Firebase ID token)

**Request**:
```json
{
  "songId": "0t1kP63rueHleOhQkYSXFY",
  "title": "Dynamite",
  "artist": "BTS",
  "album": "Dynamite"
}
```

**Response (Success - 200)**:
```json
{
  "lyrics": "'Cause I, I, I'm in the stars tonight...",
  "source": "genius",
  "geniusId": "5591631",
  "geniusUrl": "https://genius.com/Bts-dynamite-lyrics"
}
```

**Response (Error - 404)**:
```json
{
  "error": "lyrics_not_found",
  "message": "We couldn't find lyrics for this song. Try another song.",
  "retryable": false
}
```

**Response (Error - 503)**:
```json
{
  "error": "api_unavailable",
  "message": "Lyrics service is temporarily unavailable. Please try again later.",
  "retryable": true
}
```

### C. Firestore Write Operations

**Collection**: `songs/{songId}`

**Document Structure**:
```typescript
{
  id: string;                 // Spotify track ID (document ID)
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  spotifyUri: string;
  previewUrl: string | null;

  lyricsSource: 'genius';
  geniusId: string;
  geniusUrl: string;
  lyricsLanguage: LanguageCode;
  lyricsConfidence: number;

  language: LanguageCode;     // Target language (for filtering)
  addedAt: Timestamp;

  // NOTE: Full lyrics are NOT stored (copyright)
}
```

**Collection**: `users/{uid}`

**Update to `languages` array**:
```typescript
{
  languages: [
    {
      languageCode: 'ko',
      // ... other fields ...
      currentSong: {
        id: '0t1kP63rueHleOhQkYSXFY',
        title: 'Dynamite',
        artist: 'BTS',
        addedAt: Timestamp.now()
      },
      lastUpdated: Timestamp.now()
    }
  ]
}
```

---

## 8. Edge Cases

### 8.1. No Search Results

**Scenario**: User searches for obscure song, Spotify returns 0 results

**Handling**:
1. Display empty state in results area:
   ```
   🔍 No songs found

   Try searching with:
   • Different spelling
   • Artist name only
   • Song title only
   ```
2. Keep search input active (allow retry)
3. Do NOT show error (this is expected behavior)

**Acceptance Test**:
- Search for "asdfghjkl12345" → Empty state shown
- User can immediately search again

---

### 8.2. Duplicate Song Selection

**Scenario**: User selects same song that is already set as `currentSong`

**Handling**:
1. On song confirmation, check if `song.id === currentSong.id`
2. If true, show info dialog:
   ```
   This song is already selected

   [Choose Another Song] [Go Back]
   ```
3. Do NOT proceed with lyrics fetch (avoid unnecessary API calls)

**Acceptance Test**:
- User has "Dynamite" as currentSong
- User searches and selects "Dynamite" again
- Info dialog shown, no API calls made

---

### 8.3. User Cancels Mid-Flow

**Scenario**: User navigates away during lyrics fetch or validation

**Handling**:
1. All async operations (API calls) must be cancellable
2. Use AbortController for fetch requests
3. If user navigates back before completion:
   - Cancel pending requests
   - Clear loading states
   - Do NOT show error
4. Do NOT write incomplete data to Firestore

**Acceptance Test**:
- User selects song, sees "Fetching lyrics..."
- User presses back button
- Returns to Dashboard, no error shown, no data written

---

### 8.4. Low Confidence (0.5 - 0.7)

**Scenario**: Language detection is uncertain (bilingual song, slang, etc.)

**Handling**:
1. Show warning dialog:
   ```
   ⚠️ Language Uncertain

   This song might be in Korean, but we're only 65% confident.
   It may contain multiple languages or slang.

   Detected language: Korean (65% confidence)

   [Cancel] [Add Anyway]
   ```
2. If user taps "Add Anyway": Proceed with song storage (Step E)
3. If user taps "Cancel": Return to search results

**Acceptance Test**:
- Song with confidence 0.62 detected
- Warning dialog shown with accurate confidence %
- User can choose to proceed or cancel

---

### 8.5. Very Long Search Query

**Scenario**: User pastes entire song lyrics into search box

**Handling**:
1. Enforce max length: 100 characters
2. Truncate input silently (show first 100 chars)
3. Proceed with search normally

**Acceptance Test**:
- User enters 500 character query
- Only first 100 chars used for search
- No error shown

---

### 8.6. Special Characters in Search

**Scenario**: User searches with emojis, non-Latin scripts, punctuation

**Handling**:
1. Do NOT sanitize or reject (Spotify handles this)
2. Pass query as-is to Spotify API
3. Spotify will return relevant results or empty array

**Acceptance Test**:
- Search "사랑해 💜" → Returns Korean songs with "사랑해"
- Search "año nuevo" → Returns Spanish songs correctly

---

### 8.7. Network Connectivity Loss

**Scenario**: User loses internet during any API operation

**Handling**:
1. All API calls have 30-second timeout
2. On timeout, show error:
   ```
   ❌ Connection Error

   Please check your internet connection and try again.

   [Retry] [Cancel]
   ```
3. "Retry" → Repeat exact same API call
4. "Cancel" → Return to previous screen

**Acceptance Test**:
- Disable network during lyrics fetch
- After 30s, error dialog shown
- Re-enable network, tap "Retry" → Success

---

## 9. Failure Modes

### 9.1. Spotify API Unavailable

**Failure Scenario**: Spotify API returns 5xx error or times out

**Causes**:
- Spotify service outage
- Rate limit exceeded (180 req/min)
- Invalid API credentials (expired token)
- Network timeout

**Detection**:
```typescript
try {
  const response = await fetch(spotifyUrl);
  if (response.status >= 500) {
    throw new Error('api_unavailable');
  }
  if (response.status === 429) {
    throw new Error('rate_limit');
  }
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('network_error');
  }
}
```

**User-Facing Error**:
```
❌ Music Search Unavailable

Spotify is temporarily unavailable. Please try again in a few minutes.

[Try Again] [Cancel]
```

**Fallback Behavior**:
- Log error to Firebase Analytics: `spotify_api_error`
- Do NOT proceed with song selection
- Allow user to retry immediately
- If rate limit: Wait 60 seconds before retrying

**Acceptance Criteria**:
- ✅ User sees clear error message (no technical jargon)
- ✅ "Try Again" button re-attempts search
- ✅ Error is logged for monitoring
- ✅ User can navigate back without app crash

---

### 9.2. Lyrics Not Found

**Failure Scenario**: Genius API cannot find lyrics for selected song

**Causes**:
- Song is instrumental (no lyrics exist)
- Song is too new (lyrics not yet added to Genius)
- Song title/artist mismatch (search query too different)
- Regional variant not in Genius database

**Detection**:
```typescript
// Genius search returns empty results
if (geniusSearchResults.hits.length === 0) {
  throw new Error('lyrics_not_found');
}

// Scraping fails (page structure changed)
if (!scrapedLyrics || scrapedLyrics.trim().length < 50) {
  throw new Error('scraping_failed');
}
```

**User-Facing Error**:
```
❌ Lyrics Not Available

We couldn't find lyrics for this song. This might be because:
• The song is instrumental
• Lyrics haven't been added yet
• The song is very new

[Try Another Song] [Cancel]
```

**Fallback Behavior**:
- Log error to Firebase Analytics: `lyrics_not_found`
- Include song metadata (title, artist, spotifyId) for debugging
- Do NOT proceed with song selection (lyrics required for Phase 2)
- Return user to search results (keep search query)

**Acceptance Criteria**:
- ✅ User understands why lyrics are unavailable
- ✅ User can immediately search for another song
- ✅ Search query is preserved (user doesn't have to re-type)
- ✅ Error is logged with song metadata

---

### 9.3. Language Validation Failures

#### 9.3.1. Unknown Language Detected

**Failure Scenario**: `franc` cannot determine language (returns 'und' or 'unknown')

**Causes**:
- Lyrics too short (< 50 characters)
- Lyrics are purely instrumental sounds ("La la la", "Ooh ooh")
- Lyrics are numbers/symbols only
- Language not supported by `franc`

**Detection**:
```typescript
if (result.language === 'unknown' || result.confidence < 0.3) {
  throw new Error('unknown_language');
}
```

**User-Facing Error**:
```
❌ Cannot Detect Language

We couldn't determine the language of this song's lyrics.

This might be because:
• Lyrics are too short
• The song is mostly instrumental sounds
• The language is not supported

[Try Another Song] [Cancel]
```

**Fallback Behavior**:
- Log error: `language_detection_failed`
- Include lyrics length and detected result
- Do NOT allow override (safety measure)
- Return to search results

**Acceptance Criteria**:
- ✅ User understands detection failed
- ✅ User cannot bypass this error (no "Add Anyway" option)
- ✅ Error logged with diagnostic info

---

#### 9.3.2. Wrong Language Detected (High Confidence)

**Failure Scenario**: Song is in wrong language (e.g., English song when learning Korean)

**Causes**:
- User selected wrong song by mistake
- Artist has songs in multiple languages
- User wants to add song in different language (user error)

**Detection**:
```typescript
if (result.language !== targetLanguage && result.confidence >= 0.7) {
  throw new Error('wrong_language');
}
```

**User-Facing Error**:
```
❌ Wrong Language Detected

This song appears to be in English, but you're learning Korean.

Detected: English (92% confidence)
Expected: Korean

[Try Another Song] [Override (Advanced)]
```

**Fallback Behavior**:
- Show "Override" option for advanced users (hidden feature)
- If user taps "Override":
  - Show second confirmation: "Are you sure? This may result in incorrect vocabulary."
  - If confirmed: Proceed with song storage (mark as `manualOverride: true`)
- If user taps "Try Another Song": Return to search results

**Acceptance Criteria**:
- ✅ Error clearly states detected vs expected language
- ✅ Confidence percentage shown (builds trust)
- ✅ Override is possible but requires 2 confirmations
- ✅ Override is logged: `language_override_used`

---

#### 9.3.3. Low Confidence Detection

**Failure Scenario**: Confidence < 0.5 (too uncertain)

**Causes**:
- Bilingual song (English + Korean mixed)
- Heavy use of slang or loan words
- Short lyrics with ambiguous words
- Multiple languages in different verses

**Detection**:
```typescript
if (result.confidence < 0.5) {
  throw new Error('low_confidence');
}
```

**User-Facing Error**:
```
❌ Language Uncertain

We're not confident about this song's language.

Detected: Korean (45% confidence)
This is too low to ensure quality vocabulary learning.

Possible reasons:
• Song mixes multiple languages
• Heavy use of slang or loan words

[Try Another Song] [Cancel]
```

**Fallback Behavior**:
- Do NOT allow override (below safety threshold)
- Encourage user to pick different song
- Log: `low_confidence_rejection`

**Acceptance Criteria**:
- ✅ User understands confidence is too low
- ✅ No override option (safety measure)
- ✅ User can easily search for another song

---

### 9.4. Firestore Write Failure

**Failure Scenario**: Song storage fails due to permissions, quota, or network

**Causes**:
- User lost authentication token (session expired)
- Firestore quota exceeded (unlikely in MVP)
- Network timeout during write
- Firestore security rules rejection (bug)

**Detection**:
```typescript
try {
  await batch.commit();
} catch (error) {
  if (error.code === 'permission-denied') {
    throw new Error('auth_expired');
  }
  throw new Error('storage_failed');
}
```

**User-Facing Error**:
```
❌ Failed to Save Song

We couldn't save your song selection. Please try again.

[Retry] [Cancel]
```

**Fallback Behavior**:
- If auth expired: Trigger re-authentication flow
- If network/quota: Allow retry (same operation)
- Log error: `firestore_write_failed` with error code
- Do NOT mark song as selected in UI (avoid inconsistency)

**Acceptance Criteria**:
- ✅ User can retry without re-fetching lyrics
- ✅ Auth errors trigger re-authentication
- ✅ Data consistency maintained (no partial writes)

---

## 10. Acceptance Criteria

### Feature-Level Acceptance

✅ **AC1**: Given user has completed onboarding, when Dashboard loads, then music section is visible only if `currentProfile` exists

✅ **AC2**: Given user taps "Choose Song", when screen loads, then Song Selection Screen displays with search input

✅ **AC3**: Given user enters valid search query (≥ 2 chars), when search completes, then top 20 results are displayed with title, artist, and album art

✅ **AC4**: Given search returns 0 results, when results render, then empty state is shown with helpful search tips

✅ **AC5**: Given user selects a song, when confirmation dialog appears, then song title and artist are displayed correctly

✅ **AC6**: Given user confirms selection, when lyrics are fetched, then loading indicator "Fetching lyrics..." is shown

✅ **AC7**: Given lyrics are found and language matches (confidence ≥ 0.7), when validation passes, then song is stored in Firestore and user returns to Dashboard

✅ **AC8**: Given song is stored, when Dashboard renders, then selected song is displayed in music section with title and artist

✅ **AC9**: Given user taps "Choose Another Song" when new song is selected, then previous song is replaced (not added to list)

### Error Handling Acceptance

✅ **AC10**: Given Spotify API is unavailable, when search is attempted, then error dialog is shown with "Try Again" option

✅ **AC11**: Given lyrics cannot be found, when fetch fails, then error explains possible reasons and offers "Try Another Song"

✅ **AC12**: Given language detection fails (unknown), when validation runs, then error is shown with NO override option

✅ **AC13**: Given wrong language is detected (high confidence), when validation fails, then error shows detected vs expected language with override option

✅ **AC14**: Given low confidence detection (< 0.5), when validation fails, then error is shown with NO override option

✅ **AC15**: Given user loses network mid-flow, when timeout occurs, then error is shown with "Retry" option that re-attempts operation

✅ **AC16**: Given Firestore write fails, when storage is attempted, then error is shown and user can retry without re-fetching lyrics

### User Experience Acceptance

✅ **AC17**: Given user navigates back during lyrics fetch, when navigation occurs, then pending requests are cancelled and no error is shown

✅ **AC18**: Given user selects same song as current, when selection is confirmed, then info dialog explains song is already selected

✅ **AC19**: Given user searches with special characters (emojis, non-Latin), when search executes, then results are returned correctly

✅ **AC20**: Given user enters search > 100 characters, when input is processed, then query is silently truncated to 100 characters

---

## 11. Open Questions / Assumptions

### Resolved Assumptions

✅ **Assumption 1**: One song per language at a time (not playlist)
→ **Resolved**: Confirmed - MVP supports single `currentSong` per language

✅ **Assumption 2**: Lyrics are NOT stored in Firestore (copyright)
→ **Resolved**: Confirmed - only store reference (geniusId, geniusUrl)

✅ **Assumption 3**: Language override is allowed for advanced users
→ **Resolved**: Confirmed - only for high confidence wrong language (≥ 0.7)

✅ **Assumption 4**: Spotify preview URLs are optional (may be null)
→ **Resolved**: Confirmed - store if available, null is acceptable

✅ **Assumption 5**: Confidence threshold for auto-pass is 0.7
→ **Resolved**: Confirmed - 0.7+ passes, 0.5-0.7 warns, < 0.5 fails

### Open Questions (Must Be Resolved Before Implementation)

❓ **Q1**: What should happen if user selects a song, then immediately selects another before first completes?
- **Option A**: Cancel first operation, proceed with second
- **Option B**: Disable UI until first completes (show loading)
- **Option C**: Queue second request, process sequentially

**Recommendation**: Option B (simplest, avoids race conditions)

---

❓ **Q2**: Should we cache Spotify search results to avoid duplicate API calls?
- **Option A**: Yes, cache in AsyncStorage (5-minute TTL)
- **Option B**: Yes, cache in memory only (session-based)
- **Option C**: No caching (always fetch fresh)

**Recommendation**: Option B (balances performance & freshness)

---

❓ **Q3**: How to handle Spotify rate limit (180 req/min)?
- **Option A**: Implement client-side rate limiting (debounce + throttle)
- **Option B**: Implement server-side queue in Firebase Function
- **Option C**: No rate limiting (rely on Spotify's 429 response)

**Recommendation**: Option A for MVP (add Option B if scaling needed)

---

❓ **Q4**: Should we validate that `geniusUrl` is still accessible before storing?
- **Option A**: Yes, fetch URL and check 200 status (adds latency)
- **Option B**: No, assume Genius URLs are stable (faster)

**Recommendation**: Option B (Genius URLs are stable, can add validation later if needed)

---

❓ **Q5**: What analytics events should we track?
- **Suggested events**:
  - `song_search_started`
  - `song_search_completed` (with result count)
  - `song_selected`
  - `lyrics_fetched`
  - `language_validated` (with confidence)
  - `song_added_success`
  - All error events (already defined in Section 9)

**Recommendation**: Implement all suggested events for Phase 1 monitoring

---

## Notes

### Context from Dashboard Implementation

From `/docs/features/dashboard/requirements.md` Feature 3, we have:

**Already Implemented (Dashboard UI)**:
- Music section visibility (only shown when `currentProfile` exists)
- Empty state: "Choose Song" button
- Active state: Current song display + "Choose Another Song" button
- Data model: `CurrentSong` interface in `UserLanguage`

**To Be Implemented (This Feature)**:
- Song selection screen/flow
- Music API integration (Spotify, Apple Music, or YouTube Music?)
- Language validation for selected songs
- Lyrics display and extraction
- Vocabulary learning from lyrics
- Progress tracking per song
- Multiple songs per language (playlist support?)

### Initial Questions to Address

1. **Music API Selection**:
   - Which API to use? Spotify, Apple Music, YouTube Music, or multiple?
   - API authentication flow (OAuth, API keys)
   - Rate limits and costs
   - Geographic availability

2. **Song Selection**:
   - How do users find songs? (Search, browse, recommendations)
   - What metadata do we need? (title, artist, album, lyrics, language)
   - Should we cache song data in Firestore?

3. **Language Validation**:
   - How to determine a song's language?
   - API metadata vs manual tagging vs AI detection
   - What if song has multiple languages (bilingual songs)?
   - Should we allow language override by user?

4. **Lyrics**:
   - How to get lyrics? (Musixmatch, Genius, API-provided)
   - Synced vs unsynced lyrics
   - Copyright and licensing considerations
   - What if lyrics are unavailable?

5. **Vocabulary Learning**:
   - How to extract vocabulary from lyrics?
   - AI-based extraction vs pre-processed word lists
   - Difficulty level matching (align with user proficiency)
   - Translation source (dictionary API, AI translation)

6. **Progress Tracking**:
   - What metrics to track? (words learned, repetitions, mastery level)
   - Integration with Feature 4 (Vocabulary Tracking)
   - Spaced repetition algorithm?

7. **User Experience**:
   - Can users have multiple songs per language?
   - Playlist management?
   - Song recommendations based on proficiency?
   - Offline support for downloaded lyrics?

### Cross-References

- **Dashboard Integration**: See `/docs/features/dashboard/requirements.md` Feature 3
- **Vocabulary Tracking**: See `/docs/features/dashboard/requirements.md` Feature 4
- **User Profile**: See `/src/types/onboarding.ts` - `UserLanguage.currentSong`
