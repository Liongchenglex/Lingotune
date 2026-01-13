# Learn with Music Feature - Requirements

## Brain Dump

<!-- Add your requirements here -->

---

## Status
- [ ] Requirements gathering (brain dump phase)
- [ ] Requirements refinement
- [ ] Formal requirements complete
- [ ] Requirements frozen

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
