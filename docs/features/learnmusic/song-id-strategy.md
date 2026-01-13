# Song ID Generation Strategy

**Date:** 2026-01-13
**Question:** How are song IDs generated? What happens when migrating to APIs? Can IDs be repeated?

---

## TL;DR: Current IDs Are Manual, API IDs Are Unique

- **Current (Hardcoded):** Manual sequential IDs like `song-ko-001`
- **Future (API):** Use API-provided IDs like `spotify:track:3n3Ppam7vgaVa1iaRUc9Lp`
- **Collision Risk:** Zero (API IDs are globally unique)
- **Multiple Users, Same Song:** Feature, not bug (saves storage)

---

## Current Implementation (Interim)

### ID Pattern

**Format:** `song-{language}-{sequential-number}`

**Examples from `functions/data/songs.json`:**
```json
{
  "id": "song-ko-001",  // Korean song #1
  "title": "Good Goodbye",
  "artist": "HWASA"
}

{
  "id": "song-ko-002",  // Korean song #2
  "title": "You Were Beautiful",
  "artist": "DAY6"
}

{
  "id": "song-zh-001",  // Chinese song #1
  "title": "Miss You Tonight (想你的夜)",
  "artist": "Guan Zhe"
}
```

### Generation Logic

**Location:** Manually assigned in `functions/data/songs.json`

**Process:**
1. Developer manually adds song to JSON file
2. Assigns next sequential ID in format `song-{lang}-{number}`
3. Deploys updated JSON file to Firebase Functions
4. `searchSongs` and `fetchLyrics` functions read from this file

### Limitations

- ❌ Not scalable (manual data entry)
- ❌ No collision prevention (reliant on developer not making mistakes)
- ❌ Sequential numbering breaks if songs are deleted
- ❌ Cannot handle dynamic song searches
- ✅ Simple and predictable (good for MVP)

---

## Future Implementation (With APIs)

### API-Provided IDs

When integrating with Spotify or Apple Music APIs, we'll use IDs provided by the APIs themselves.

#### Spotify IDs

**Format:** `spotify:track:{base62-encoded-string}`

**Example:**
```json
{
  "id": "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
  "title": "Dynamite",
  "artist": "BTS"
}
```

**Characteristics:**
- Globally unique across all Spotify tracks
- 22-character base62 string
- Never changes for a track
- Can be used directly as Firestore document ID

**How Generated:**
- Spotify assigns IDs when tracks are added to their catalog
- We receive ID in API response and use it directly
- No ID generation logic needed on our side

#### Apple Music IDs

**Format:** `{numeric-id}`

**Example:**
```json
{
  "id": "1588305515",
  "title": "Dynamite",
  "artist": "BTS"
}
```

**Characteristics:**
- Globally unique across all Apple Music tracks
- Numeric string
- Never changes for a track
- Can be used directly as Firestore document ID

**Optional Enhancement:**
If we want to distinguish between Spotify and Apple Music IDs in Firestore:
```json
{
  "id": "apple:track:1588305515",  // Prefixed for clarity
  "title": "Dynamite",
  "artist": "BTS"
}
```

### ID Generation Logic (Future)

**Location:** `functions/src/searchSongs.ts`

**Process:**
```typescript
// BEFORE (Current)
const allSongs = loadFromJSON();
const songs = allSongs.filter(s => s.language === language);
// IDs are hardcoded: "song-ko-001"

// AFTER (With Spotify API)
const apiResults = await searchSpotifyAPI(query, language);
const songs = apiResults.tracks.map(track => ({
  id: track.id,  // Use Spotify's ID directly: "spotify:track:abc123"
  title: track.name,
  artist: track.artists[0].name,
  // ... other fields
}));

// AFTER (With Apple Music API)
const apiResults = await searchAppleMusicAPI(query, language);
const songs = apiResults.tracks.map(track => ({
  id: track.id,  // Use Apple Music's ID directly: "1588305515"
  title: track.attributes.name,
  artist: track.attributes.artistName,
  // ... other fields
}));
```

**Key Point:** We don't generate IDs. We use what the API gives us.

---

## Collision Handling

### Question: What if multiple users add the same song?

**Answer:** This is a **feature**, not a bug!

### Scenario

```
User A (Korean learner) adds "Dynamite" by BTS
  ↓
Firestore: /songs/spotify:track:3n3Ppam7 created
           /users/userA/languages[0].songs[] += { id: "spotify:track:3n3Ppam7", ... }

User B (English learner) also adds "Dynamite" by BTS
  ↓
Firestore: /songs/spotify:track:3n3Ppam7 ALREADY EXISTS
           /users/userB/languages[0].songs[] += { id: "spotify:track:3n3Ppam7", ... }
```

### Result

**Both users reference the SAME `/songs/{id}` document:**
```
/songs/spotify:track:3n3Ppam7
{
  id: "spotify:track:3n3Ppam7",
  title: "Dynamite",
  artist: "BTS",
  lyrics: "Cause I, I, I'm in the stars tonight...",
  album: "Dynamite",
  albumArt: "https://...",
  // ... full metadata
}

/users/userA
{
  languages: [
    {
      languageCode: "ko",
      songs: [
        { id: "spotify:track:3n3Ppam7", title: "Dynamite", artist: "BTS" }
      ]
    }
  ]
}

/users/userB
{
  languages: [
    {
      languageCode: "en",
      songs: [
        { id: "spotify:track:3n3Ppam7", title: "Dynamite", artist: "BTS" }
      ]
    }
  ]
}
```

### Benefits

✅ **Storage Efficiency:** Only one copy of song metadata + lyrics
✅ **Cost Savings:** Only one Firestore document instead of duplicates
✅ **Consistency:** All users see the same lyrics (good for community features later)
✅ **Cache Hits:** If User B adds a song User A already added, lyrics are already cached

### Implementation

**Current code in `SongSelectionScreen.tsx:194`:**
```typescript
const songRef = doc(db, 'songs', song.id);
batch.set(songRef, {
  id: song.id,
  title: song.title,
  artist: song.artist,
  // ... all fields
});
```

**Problem:** Using `batch.set()` without `merge: true` will **overwrite** existing song documents.

**Solution:** Use `merge: true` to avoid overwriting if song already exists:
```typescript
const songRef = doc(db, 'songs', song.id);
batch.set(songRef, {
  id: song.id,
  title: song.title,
  artist: song.artist,
  album: song.album,
  albumArt: song.albumArt,
  duration: song.duration,
  spotifyUri: song.spotifyUri,
  previewUrl: song.previewUrl,
  lyricsSource: lyricsData.source,
  geniusId: lyricsData.geniusId,
  geniusUrl: lyricsData.geniusUrl,
  lyricsLanguage: validation.detected,
  lyricsConfidence: validation.confidence,
  language: language.languageCode,
  addedAt: Timestamp.now(),
}, { merge: true });  // ← ADD THIS
```

**Behavior with `merge: true`:**
- First user creates document
- Second user updates/refreshes metadata (if API data changed)
- Existing lyrics preserved (not re-fetched)
- Both users' profiles reference same song

---

## Migration Strategy

### Coexistence: Old IDs + New IDs

When we migrate to APIs, we'll have a mix of old hardcoded IDs and new API IDs.

**Firestore State During Migration:**
```
/songs/
├── song-ko-001              ← Old hardcoded song (source: "hardcoded")
├── song-ko-002              ← Old hardcoded song (source: "hardcoded")
├── spotify:track:abc123     ← New API song (source: "spotify")
└── spotify:track:xyz789     ← New API song (source: "spotify")
```

**User Profile During Migration:**
```json
{
  "languages": [
    {
      "languageCode": "ko",
      "songs": [
        { "id": "song-ko-001", "title": "Good Goodbye", ... },      // Old
        { "id": "spotify:track:abc123", "title": "Dynamite", ... }  // New
      ]
    }
  ]
}
```

**Result:**
- ✅ No breaking changes
- ✅ Old songs still work
- ✅ New songs work too
- ✅ No migration required for existing users

### Optional: Migrate Old Songs to Real IDs

If we want to replace hardcoded songs with real API equivalents:

**Migration Script (Admin Tool):**
```typescript
// For each hardcoded song
const oldSong = { id: "song-ko-001", title: "Good Goodbye", artist: "HWASA" };

// Search Spotify for matching song
const spotifyResults = await searchSpotify("Good Goodbye HWASA");
const spotifyMatch = spotifyResults[0];

// Update user profile to use Spotify ID
const userRef = doc(db, 'users', userId);
const userProfile = await getDoc(userRef);

const updatedLanguages = userProfile.languages.map(lang => {
  if (lang.languageCode === 'ko') {
    const updatedSongs = lang.songs.map(song => {
      if (song.id === 'song-ko-001') {
        return {
          ...song,
          id: spotifyMatch.id  // Replace with Spotify ID
        };
      }
      return song;
    });

    return { ...lang, songs: updatedSongs };
  }
  return lang;
});

await updateDoc(userRef, { languages: updatedLanguages });
```

**Trade-offs:**
- ✅ Users get real album art, preview URLs, richer metadata
- ⚠️ Risk of mismatched songs (wrong search result)
- ⚠️ Complex migration script needed
- ⚠️ Potential data loss if migration fails

**Recommendation:** Keep old songs as-is. They work perfectly fine.

---

## ID Uniqueness Guarantees

### Spotify

**Guarantee:** Globally unique across all tracks on Spotify

**How Spotify Generates IDs:**
- Uses base62 encoding (0-9, a-z, A-Z)
- 22-character string = 62^22 = 2^131 possible IDs
- Collision probability: Effectively zero

**Example:**
- "Dynamite" by BTS: `spotify:track:3n3Ppam7vgaVa1iaRUc9Lp`
- "Dynamite" by Taio Cruz: `spotify:track:5bqHfcuxH6eWZm8GBQAI1e` (different ID)

### Apple Music

**Guarantee:** Globally unique across all tracks on Apple Music

**How Apple Music Generates IDs:**
- Numeric IDs
- Example: `1588305515`

**Example:**
- "Dynamite" by BTS: `1588305515`
- Different track will have different numeric ID

### Collision Risk

**Between Spotify and Apple Music:**
- Possible if we use raw numeric IDs from Apple Music
- Example: Spotify URI `spotify:track:123` vs Apple Music ID `123`

**Solution 1:** Use full Spotify URI format
```typescript
// Spotify
id: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"

// Apple Music
id: "1588305515"

// No collision because Spotify always has "spotify:track:" prefix
```

**Solution 2:** Prefix Apple Music IDs
```typescript
// Spotify
id: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"

// Apple Music
id: "apple:track:1588305515"

// Explicit prefixes prevent collisions
```

**Recommendation:** Use full Spotify URI format + prefix Apple Music IDs.

---

## Edge Cases

### Edge Case 1: Same Song, Different APIs

**Scenario:**
```
User A adds "Dynamite" from Spotify API
  → id: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"

User B adds "Dynamite" from Apple Music API
  → id: "apple:track:1588305515"
```

**Result:**
- Two separate documents in `/songs/` collection
- Both reference the same song (different IDs)
- Lyrics might be duplicated

**Solution (Future Enhancement):**
Store ISRC (International Standard Recording Code) to detect duplicates:
```typescript
/songs/spotify:track:3n3Ppam7
{
  id: "spotify:track:3n3Ppam7",
  title: "Dynamite",
  artist: "BTS",
  isrc: "USRC17607839",  // Universal identifier
  source: "spotify"
}

/songs/apple:track:1588305515
{
  id: "apple:track:1588305515",
  title: "Dynamite",
  artist: "BTS",
  isrc: "USRC17607839",  // SAME ISRC
  source: "apple_music"
}

// Could merge these later by matching ISRC
```

### Edge Case 2: Song Removed from API

**Scenario:**
```
User adds song from Spotify in 2024
  → id: "spotify:track:abc123"
  → Firestore: /songs/spotify:track:abc123 created

Song removed from Spotify in 2026
  → Spotify API returns 404

User tries to view lyrics
  → ???
```

**Solution:**
Lyrics are cached in Firestore, so they still work:
```typescript
// User profile still references song
languages[0].songs = [
  { id: "spotify:track:abc123", title: "Old Song", artist: "Artist" }
]

// Firestore still has cached data
/songs/spotify:track:abc123 = {
  id: "spotify:track:abc123",
  title: "Old Song",
  lyrics: "...",  // Cached lyrics
  // ... all data preserved
}

// Lyrics screen fetches from Firestore (not API)
// ✅ Works perfectly even if song deleted from Spotify
```

**Only affected:**
- Preview URL (external link, might 404)
- Album art (external link, might 404)

**Graceful fallback:**
```typescript
// In LyricsScreen
if (!song.previewUrl || previewUrlReturns404) {
  // Just don't show preview button
  // Lyrics still work
}
```

### Edge Case 3: Hardcoded ID Collision with API ID

**Scenario:**
```
Hardcoded song: { id: "song-ko-001" }
Spotify song: { id: "song-ko-001" }  // Extremely unlikely but theoretically possible
```

**Probability:** Effectively zero

Spotify IDs are base62-encoded 22-character strings. The probability of generating `song-ko-001` is astronomically low (would require deliberate manipulation).

Apple Music uses numeric IDs, so collision with `song-ko-001` is impossible.

**If it happens anyway:**
- Use prefixed IDs: `hardcoded:song-ko-001` vs `spotify:track:song-ko-001`

---

## Implementation Checklist

### Current (Hardcoded)
- [x] IDs manually assigned in `functions/data/songs.json`
- [x] Format: `song-{language}-{number}`
- [x] No collision detection needed (manual)
- [x] Saved to Firestore as-is

### Phase 1: Spotify API
- [ ] Use Spotify-provided IDs directly
- [ ] Format: `spotify:track:{base62}`
- [ ] Save to Firestore with `{ merge: true }`
- [ ] Test collision handling (multiple users, same song)
- [ ] Verify hardcoded songs coexist with Spotify songs

### Phase 2: Apple Music API
- [ ] Use Apple Music-provided IDs with prefix
- [ ] Format: `apple:track:{numeric}`
- [ ] Save to Firestore with `{ merge: true }`
- [ ] Verify no collisions with Spotify IDs
- [ ] Test all three ID formats coexisting

### Phase 3: Deduplication (Optional)
- [ ] Add ISRC to song metadata
- [ ] Create admin tool to merge duplicate songs
- [ ] Migrate user profiles to canonical song ID
- [ ] Delete duplicate `/songs/` documents

---

## Summary

| Aspect | Current (Hardcoded) | Future (API) |
|--------|---------------------|--------------|
| **ID Format** | `song-ko-001` | `spotify:track:abc123` or `apple:track:123` |
| **Generation** | Manual (developer) | API-provided (automatic) |
| **Uniqueness** | Developer responsibility | Guaranteed by API |
| **Collision Risk** | Low (manual) | Zero (globally unique) |
| **Multiple Users** | N/A (hardcoded) | Feature (saves storage) |
| **Migration** | N/A | Coexist peacefully |

---

## Conclusion

**Current ID Strategy:**
- Simple manual IDs for MVP
- Works fine for hardcoded songs
- Not scalable

**Future ID Strategy:**
- Use API-provided IDs directly
- No ID generation logic needed
- Zero collision risk
- Multiple users, same song = good (storage savings)
- Coexistence with old IDs = no breaking changes

**Key Implementation Detail:**
Use `batch.set(songRef, {...}, { merge: true })` to prevent overwriting when multiple users add the same song.

**Answer to Original Question:**
> "how are the song ids being generated? what is the logic if we are using api and will it be repeated?"

- **Current:** Manual IDs like `song-ko-001`
- **Future:** API IDs like `spotify:track:abc123`
- **Repeated IDs:** Zero risk (APIs guarantee uniqueness)
- **Multiple users, same song:** Intentional (saves storage, good design)
