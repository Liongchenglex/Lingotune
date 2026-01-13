# Learn with Music Feature - Setup Instructions

## API Credentials Setup

### 1. Apple Music API Setup

1. **Prerequisites**
   - Active Apple Developer account ($99/year)
   - Already have this ✅

2. **Create MusicKit Identifier**
   - Go to: https://developer.apple.com/account/resources/identifiers/list
   - Click "+" to create new identifier
   - Select "Media IDs" → "MusicKit ID"
   - Description: "LingoTune Music"
   - Click "Continue" → "Register"

3. **Create API Key**
   - Go to: https://developer.apple.com/account/resources/authkeys/list
   - Click "+" to create new key
   - Name: "LingoTune MusicKit Key"
   - Check "MusicKit"
   - Click "Continue" → "Register"
   - **IMPORTANT**: Download the `.p8` key file (you can only download once!)
   - Note the **Key ID** (e.g., `ABC123DEFG`)

4. **Get Team ID**
   - Go to: https://developer.apple.com/account
   - Find your **Team ID** in the membership section (e.g., `XYZ987WXYZ`)

5. **Prepare Private Key**
   - Open the downloaded `.p8` file in a text editor
   - Copy the entire content (including BEGIN/END lines)
   - Base64 encode it:
     ```bash
     cat AuthKey_ABC123DEFG.p8 | base64
     ```
   - Copy the base64 output

6. **Add to Firebase Functions**

   **Option A: Using Firebase Config (Production)**
   ```bash
   firebase functions:config:set \
     applemusic.team_id="YOUR_TEAM_ID" \
     applemusic.key_id="YOUR_KEY_ID" \
     applemusic.private_key="BASE64_ENCODED_P8_FILE"
   ```

   **Option B: Using .env file (Development)**
   Create `functions/.env.development`:
   ```
   APPLE_TEAM_ID=XYZ987WXYZ
   APPLE_KEY_ID=ABC123DEFG
   APPLE_PRIVATE_KEY=LS0tLS1CRUdJTi... (base64 encoded .p8 file)
   ```

---

### 2. Genius API Setup

1. **Create Genius Account**
   - Go to: https://genius.com/api-clients
   - Log in or create account

2. **Create API Client**
   - Click "New API Client"
   - App Name: "LingoTune"
   - App Website URL: (any URL or leave blank)
   - Icon URL: (optional)
   - Click "Save"

3. **Generate Access Token**
   - Click on your app
   - Click "Generate Access Token"
   - Copy the token

4. **Add to Firebase Functions**

   **Option A: Using Firebase Config (Production)**
   ```bash
   firebase functions:config:set genius.access_token="YOUR_ACCESS_TOKEN"
   ```

   **Option B: Using .env file (Development)**
   Add to `functions/.env.development`:
   ```
   GENIUS_ACCESS_TOKEN=your_access_token_here
   ```

---

## Testing API Credentials

### Test Apple Music Credentials

```bash
# In functions directory (from root: cd functions)
npm run shell

# Then test:
searchSongs({ query: "Dynamite BTS", limit: 5 })
```

Expected output: Array of 5 songs with metadata from Apple Music

### Test Genius Credentials

```bash
# In functions directory
npm run shell

# Then test:
fetchLyrics({ songId: "test", title: "Dynamite", artist: "BTS" })
```

Expected output: Lyrics with Genius URL

---

## Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
// Songs collection (shared across users)
match /songs/{songId} {
  // Anyone authenticated can read songs
  allow read: if request.auth != null;

  // Only authenticated users can write (create songs)
  allow create: if request.auth != null
    && request.resource.data.id is string
    && request.resource.data.title is string
    && request.resource.data.artist is string;

  // No updates or deletes (songs are immutable)
  allow update, delete: if false;
}

// User-specific song data (vocabulary, progress) - Phase 2
match /userSongs/{userId}/songs/{songId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Deployment Checklist

- [ ] Spotify credentials configured (production)
- [ ] Genius credentials configured (production)
- [ ] Firestore security rules deployed
- [ ] Firebase Functions deployed: `firebase deploy --only functions`
- [ ] Test searchSongs function with real query
- [ ] Test fetchLyrics function with real song
- [ ] Verify language detection works with franc

---

## Development Environment

### Local Firebase Functions Testing

1. **Start Firebase emulator**:
   ```bash
   cd functions
   npm run serve
   ```

2. **Or use functions shell**:
   ```bash
   npm run shell
   ```

3. **Test functions**:
   ```javascript
   searchSongs({ query: "test", limit: 5 })
   fetchLyrics({ songId: "123", title: "Dynamite", artist: "BTS" })
   ```

---

## Troubleshooting

### Apple Music API Errors

**401 Unauthorized**:
- Check Team ID, Key ID, and Private Key are correct
- Verify .p8 file was base64 encoded correctly
- Ensure credentials are set in Firebase config or .env
- Check that MusicKit is enabled for your API key

**429 Rate Limit**:
- Wait 60 seconds and retry
- Apple Music has generous rate limits (should not hit often)

**403 Forbidden**:
- Verify MusicKit identifier is registered
- Check API key permissions

**JWT Token Errors**:
- Ensure .p8 file format is correct (ES256 key)
- Verify Team ID and Key ID match your Apple Developer account

### Genius API Errors

**401 Unauthorized**:
- Check Access Token is correct
- Verify token is set in Firebase config or .env

**Lyrics Not Found**:
- Try different search query
- Some songs don't have lyrics on Genius
- Check if song title/artist are spelled correctly

**Scraping Failed**:
- Genius might have changed their HTML structure
- May need to update cheerio selectors in fetchLyrics.ts

---

## Cost Estimates

- **Apple Music API**: Free (included with Apple Developer membership)
- **Genius API**: Free (no official rate limit documented)
- **Firebase Functions**: ~$0.40 per 1M invocations
- **Firestore**: Reads/writes fall within free tier for MVP

**Total estimated cost**: < $5/month for 100 active users (excluding $99/year Apple Developer membership)
