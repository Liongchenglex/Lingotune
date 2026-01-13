# API Migration Strategy - Learn with Music Feature

**Status:** Planning Document
**Current Implementation:** Hardcoded JSON (MVP/Interim)
**Target Implementation:** Real Music APIs (Production)
**Last Updated:** 2026-01-13

---

## Overview

This document outlines the migration path from the current **interim hardcoded implementation** to a production-ready system using real music APIs.

### Current State (MVP - Interim Workaround)

**Why Hardcoded?**
- Rapid MVP development without API integration complexity
- Avoids API keys, rate limits, and authentication during initial development
- Allows testing of core UX flows without external dependencies

**Current Implementation:**
- **Song Search:** Returns hardcoded songs from `functions/data/songs.json`
- **Lyrics Fetch:** Returns hardcoded lyrics from `functions/data/songs.json`
- **Function:** `searchSongs` and `fetchLyrics` both read from JSON file

**Limitations:**
- Fixed song catalog (no real search)
- Manual data entry for new songs
- No album art, preview URLs, or rich metadata
- Cannot scale beyond hardcoded data

---

## Target State (Production)

### Music Search API
**Primary Option:** Apple Music API
**Fallback Option:** Spotify API

**Selection Criteria:**
- Whichever API becomes available first (based on developer account approval)
- Apple Music preferred (better international catalog, lyrics support)
- Spotify acceptable (larger catalog, better developer docs)

### Lyrics API
**Primary Option:** Genius API
**Fallback Options:**
- Musixmatch API (if Genius unavailable)
- LyricFind API (commercial option)

---

## Migration Strategy

### Phase 1: Add Real Music Search (Keep Hardcoded Lyrics)

**Goal:** Replace hardcoded song search with real API while keeping lyrics simple.

**Changes Required:**

#### 1.1 Backend (`functions/src/searchSongs.ts`)

**Current Implementation:**
```typescript
// MVP VERSION: Returns hardcoded songs from JSON file
const allSongs: HardcodedSong[] = (songsData as any).default || songsData;
let filteredSongs = allSongs;

if (language) {
  filteredSongs = filteredSongs.filter(song => song.language === language);
}
```

**Target Implementation:**
```typescript
// PRODUCTION VERSION: Call Apple Music / Spotify API
import { searchAppleMusic } from './integrations/appleMusic';
// OR
import { searchSpotify } from './integrations/spotify';

const apiResults = await searchAppleMusic({
  query: query,
  language: language,
  limit: limit
});

// Transform API response to our standard format
const tracks = apiResults.map(track => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  albumArt: track.albumArt,
  duration: track.duration,
  spotifyUri: track.uri,  // or appleMusic URL
  previewUrl: track.previewUrl
}));
```

**Migration Steps:**
1. Create `functions/src/integrations/appleMusic.ts` (or `spotify.ts`)
2. Add API credentials to environment variables
3. Implement API client with error handling, rate limiting
4. Add feature flag to toggle between hardcoded and real API
5. Test with real API, compare results quality
6. Switch feature flag when ready

**Environment Variables Required:**
```bash
# Apple Music
APPLE_MUSIC_TEAM_ID=xxx
APPLE_MUSIC_KEY_ID=xxx
APPLE_MUSIC_PRIVATE_KEY=xxx

# OR Spotify
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
```

**Rollout Strategy:**
- Deploy with feature flag OFF (keep hardcoded)
- Test in staging with feature flag ON
- Gradually roll out to production users (10% → 50% → 100%)
- Monitor error rates, latency, API costs

#### 1.2 Data Structure (No Changes Required)

The current `SpotifyTrack` interface already supports real API data:
```typescript
export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  spotifyUri: string;  // Works for Apple Music URLs too
  previewUrl: string;
}
```

✅ No frontend changes needed - interface is API-agnostic

#### 1.3 Firestore `/songs` Collection

**Current:** Songs stored with hardcoded data
**Target:** Songs stored with real API metadata

**Migration Plan:**
- Keep existing hardcoded songs (don't break existing users)
- New songs saved with richer metadata from API
- Add `source` field: `"hardcoded"` vs `"apple_music"` vs `"spotify"`

**Updated Firestore Schema:**
```typescript
/songs/{songId}
{
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;  // Real album art URL from API
  duration: number;
  spotifyUri: string;
  previewUrl: string;
  lyricsSource: 'hardcoded' | 'genius' | 'musixmatch';
  geniusId: string;
  geniusUrl: string;
  lyricsLanguage: string;
  lyricsConfidence: number;
  language: string;

  // NEW FIELDS
  source: 'hardcoded' | 'apple_music' | 'spotify';  // Track data origin
  apiMetadata?: {
    externalId: string;      // Apple Music ID or Spotify ID
    externalUrl: string;     // Link to song on platform
    isrc?: string;           // International Standard Recording Code
  };

  addedAt: Timestamp;
}
```

---

### Phase 2: Add Real Lyrics Fetching

**Goal:** Replace hardcoded lyrics with Genius API.

**Changes Required:**

#### 2.1 Backend (`functions/src/fetchLyrics.ts`)

**Current Implementation:**
```typescript
// MVP VERSION: Returns hardcoded lyrics from JSON file
const allSongs: HardcodedSong[] = (songsData as any).default || songsData;
const song = allSongs.find(s => s.id === data.songId);

return {
  lyrics: song.lyrics,
  source: 'hardcoded',
  geniusId: song.id,
  geniusUrl: `https://example.com/song/${song.id}`
};
```

**Target Implementation:**
```typescript
// PRODUCTION VERSION: Call Genius API
import { searchGenius, fetchGeniusLyrics } from './integrations/genius';

// Step 1: Search Genius for the song
const searchResults = await searchGenius({
  query: `${data.title} ${data.artist}`,
  language: language
});

if (searchResults.length === 0) {
  return { error: 'lyrics_not_found', message: 'No lyrics found' };
}

// Step 2: Fetch lyrics from Genius
const geniusSong = searchResults[0];
const lyrics = await fetchGeniusLyrics(geniusSong.id);

return {
  lyrics: lyrics.text,
  source: 'genius',
  geniusId: geniusSong.id,
  geniusUrl: geniusSong.url
};
```

**Migration Steps:**
1. Create `functions/src/integrations/genius.ts`
2. Add Genius API token to environment variables
3. Implement Genius search + scraping (Genius doesn't provide lyrics in API)
4. Add fallback to hardcoded lyrics if Genius fails
5. Cache lyrics in Firestore to reduce API calls

**Environment Variables Required:**
```bash
GENIUS_ACCESS_TOKEN=xxx
```

**Caching Strategy:**
Once lyrics are fetched from Genius, store them in `/songs/{songId}` collection:
- First fetch: Call Genius API, save to Firestore
- Subsequent fetches: Read from Firestore (no API call)
- Update stale lyrics: Background job every 6 months

#### 2.2 Lyrics Storage in Firestore

**Current:**
```typescript
/songs/{songId}
{
  // ... song metadata
  // NO LYRICS STORED (fetched from JSON every time)
}
```

**Target:**
```typescript
/songs/{songId}
{
  // ... song metadata

  // NEW: Cache lyrics in Firestore
  lyrics: string;           // Full lyrics text
  lyricsSource: 'hardcoded' | 'genius' | 'musixmatch';
  lyricsCachedAt: Timestamp;
  lyricsLastVerified: Timestamp;
}
```

**Benefits:**
- Faster lyrics loading (read from Firestore, not API)
- Lower API costs (cache hits)
- Offline support

---

### Phase 3: Deprecate Hardcoded Data

**Goal:** Remove `functions/data/songs.json` dependency.

**Timeline:** After both Phase 1 & 2 are stable for 3+ months.

**Steps:**
1. Add admin tool to migrate hardcoded songs to real API IDs
2. For each hardcoded song, search Apple Music/Spotify and link
3. Fetch real lyrics from Genius and update Firestore
4. Mark all hardcoded songs with `source: 'migrated_from_hardcoded'`
5. Delete `functions/data/songs.json`
6. Remove hardcoded fallback code

**User Impact:**
- Existing users with hardcoded songs: Songs still work, but now have real API IDs
- New users: Only use real APIs from day 1

---

## Migration Timeline

| Phase | Task | Estimated Time | Dependencies |
|-------|------|----------------|--------------|
| **Phase 1** | Apple Music / Spotify Integration | 2-3 weeks | API access approval |
| | Feature flag + A/B testing | 1 week | Phase 1 complete |
| | Production rollout (gradual) | 2 weeks | Testing complete |
| **Phase 2** | Genius API Integration | 2 weeks | Phase 1 stable |
| | Lyrics caching in Firestore | 1 week | Phase 2 complete |
| | Production rollout | 1 week | Testing complete |
| **Phase 3** | Migrate hardcoded songs | 1-2 weeks | Both phases stable 3+ months |
| | Remove hardcoded fallbacks | 3 days | Migration complete |

**Total:** ~10-12 weeks (excluding API approval wait time)

---

## API Selection Matrix

### Apple Music API

**Pros:**
- Official lyrics support (synced lyrics in some regions)
- Better international catalog (especially Asia)
- High-quality metadata
- 30-second previews

**Cons:**
- Requires Apple Developer account ($99/year)
- JWT authentication (more complex)
- Stricter rate limits
- Less community support/examples

**Best For:**
- Apps targeting international users
- Premium user experience
- If lyrics integration is critical

### Spotify API

**Pros:**
- Free developer account
- Excellent documentation
- Large community support
- More generous rate limits
- OAuth2 authentication (simpler)

**Cons:**
- No official lyrics endpoint
- Some catalog gaps in Asia
- Need to integrate separate lyrics API

**Best For:**
- Rapid development
- Cost-sensitive projects
- If community/support is important

### Genius API (Lyrics)

**Pros:**
- Largest lyrics database
- Annotations and explanations
- Free tier available
- Good search quality

**Cons:**
- No official lyrics endpoint (must scrape)
- Rate limits on free tier
- Terms of Service restrictions on scraping
- Lyrics quality varies (user-generated)

**Fallbacks:**
- Musixmatch API (commercial, official lyrics)
- LyricFind API (commercial, used by Spotify)
- AZLyrics scraping (last resort, legal risks)

---

## Implementation Checklist

### Pre-Migration
- [ ] Choose music API (Apple Music or Spotify)
- [ ] Apply for API access / developer account
- [ ] Apply for Genius API access
- [ ] Review API terms of service for compliance
- [ ] Estimate monthly API costs at scale
- [ ] Add API credentials to environment variables

### Phase 1: Music Search
- [ ] Create `functions/src/integrations/appleMusic.ts` or `spotify.ts`
- [ ] Implement API authentication
- [ ] Implement search endpoint with error handling
- [ ] Add rate limiting and retry logic
- [ ] Add feature flag (`USE_REAL_MUSIC_API`)
- [ ] Update `searchSongs` to use real API
- [ ] Add fallback to hardcoded if API fails
- [ ] Test search quality for all supported languages
- [ ] Deploy to staging with feature flag ON
- [ ] Monitor error rates and latency
- [ ] Gradually roll out to production (10% → 50% → 100%)

### Phase 2: Lyrics Fetching
- [ ] Create `functions/src/integrations/genius.ts`
- [ ] Implement Genius search
- [ ] Implement lyrics scraping (if needed)
- [ ] Add lyrics caching in Firestore
- [ ] Update `fetchLyrics` to use Genius API
- [ ] Add fallback to hardcoded if Genius fails
- [ ] Test lyrics quality and language detection
- [ ] Deploy to staging
- [ ] Monitor API usage and costs
- [ ] Gradually roll out to production

### Phase 3: Deprecation
- [ ] Build admin tool to migrate hardcoded songs
- [ ] Migrate existing users' songs to real API IDs
- [ ] Monitor migration success rate
- [ ] Remove `functions/data/songs.json`
- [ ] Remove hardcoded fallback code
- [ ] Update documentation

---

## Cost Estimates

### Apple Music API
- **Free Tier:** 1,000 requests/day
- **Overage:** Contact Apple for enterprise pricing
- **Estimated Cost (1,000 users):** ~$0-50/month

### Spotify API
- **Free Tier:** Generous (no published limits)
- **Rate Limits:** 10 requests/second
- **Estimated Cost:** $0/month (free)

### Genius API
- **Free Tier:** ~1,000 requests/day
- **Paid Tier:** Contact for pricing
- **Estimated Cost (1,000 users):** $0-100/month (depends on caching effectiveness)

**Total Estimated Monthly Cost:** $0-150/month for 1,000 active users

**Note:** Costs scale with usage. Implement aggressive caching to minimize API calls.

---

## Risk Mitigation

### API Availability Risks
- **Risk:** API downtime or rate limit exceeded
- **Mitigation:** Fallback to cached data, show graceful error messages

### API Costs
- **Risk:** Unexpected usage spikes
- **Mitigation:** Set up billing alerts, implement request quotas per user

### Data Quality
- **Risk:** Wrong songs returned, poor lyrics quality
- **Mitigation:** User feedback buttons ("Report incorrect lyrics"), manual review queue

### Terms of Service Violations
- **Risk:** Scraping lyrics violates ToS
- **Mitigation:** Use official APIs where possible, consult legal counsel, have fallback plans

### Migration Bugs
- **Risk:** Breaking existing users during migration
- **Mitigation:** Feature flags, gradual rollout, preserve backward compatibility

---

## Testing Strategy

### Unit Tests
- Mock API responses for `searchAppleMusic`, `searchSpotify`, `searchGenius`
- Test error handling (API down, rate limit, invalid response)
- Test caching logic

### Integration Tests
- Test real API calls in staging environment
- Verify song search returns correct results
- Verify lyrics fetching returns valid text
- Test language filtering works correctly

### User Acceptance Testing
- 10 beta users test song search and lyrics
- Collect feedback on song quality, lyrics accuracy
- Measure search latency, lyrics load time

### Load Testing
- Simulate 100 concurrent song searches
- Verify API rate limits are respected
- Check Firestore caching reduces API calls

---

## Monitoring & Observability

### Metrics to Track
- **API Latency:** p50, p95, p99 response times
- **API Error Rate:** 4xx, 5xx errors per endpoint
- **Cache Hit Rate:** Percentage of lyrics served from cache vs API
- **User Satisfaction:** Track "Report incorrect lyrics" button clicks
- **Costs:** Daily API usage and billing

### Alerts
- API error rate > 5%
- API latency p95 > 3 seconds
- Daily API cost > $50
- Cache hit rate < 80%

### Logging
```typescript
console.log('🎵 Music API Call', {
  api: 'apple_music' | 'spotify' | 'genius',
  endpoint: 'search' | 'lyrics',
  query: query,
  language: language,
  latency: responseTime,
  cached: isCached,
  userId: context.auth.uid
});
```

---

## Rollback Plan

If migration causes critical issues:

1. **Immediate:** Toggle feature flag OFF → revert to hardcoded data
2. **Short-term:** Investigate root cause, fix bugs, redeploy
3. **Long-term:** If unfixable, stay on hardcoded until resolved

**Rollback Triggers:**
- API error rate > 10%
- User complaints > 5% of users
- Costs exceed budget by 2x
- Legal/ToS issues discovered

---

## Future Enhancements (Post-Migration)

Once real APIs are integrated, consider:

1. **Synced Lyrics:** Show lyrics synchronized with audio playback
2. **Audio Preview:** Play 30-second song previews in-app
3. **Rich Metadata:** Show album art, release date, genre
4. **Personalization:** Recommend songs based on user's learning level
5. **Multi-language Songs:** Detect and handle songs with mixed languages
6. **Community Corrections:** Let users suggest lyric corrections
7. **Offline Mode:** Cache songs and lyrics for offline learning

---

## References

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Genius API Documentation](https://docs.genius.com/)
- [Musixmatch API](https://developer.musixmatch.com/)

---

## Questions / Decisions Needed

- [ ] Which music API to prioritize? (Apple Music vs Spotify)
- [ ] Budget for API costs? (affects migration timeline)
- [ ] Legal review needed for lyrics scraping?
- [ ] User communication plan for migration?
- [ ] Backward compatibility requirements?

---

**Document Owner:** Development Team
**Review Cadence:** Monthly until migration complete
**Status Updates:** Track in project management tool
