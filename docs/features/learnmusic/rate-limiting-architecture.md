# Rate Limiting Architecture

## Overview

Rate limiting is implemented **server-side using Firestore** to prevent abuse and resource exhaustion. This ensures security even if the app is reverse-engineered.

## Why Server-Side Rate Limiting?

❌ **Client-side rate limiting is insecure:**
- Users can clear app data to reset limits
- App can be decompiled and modified
- No protection against automated attacks

✅ **Server-side rate limiting is secure:**
- Limits enforced before any processing occurs
- Cannot be bypassed by client manipulation
- Works across all devices for the same user
- Protects against automated abuse

## Architecture

### Data Storage: Firestore

```
/rateLimits/{userId}/actions/{actionName}
{
  count: 5,
  windowStart: 1706000000000,
  lastRequest: 1706000030000
}
```

**Why Firestore?**
- Atomic transactions prevent race conditions
- Global consistency across regions
- Automatic cleanup via TTL (Time To Live)
- No additional infrastructure needed

### Rate Limit Flow

```
Client Request
    ↓
Firebase Function
    ↓
checkRateLimit(userId, action, config)
    ↓
Firestore Transaction
    ├─ Read current count
    ├─ Check if within limit
    ├─ Increment count (atomic)
    └─ Return result
    ↓
Allowed? ─── YES → Process request
         └── NO  → Return 429 with retryAfter
```

### Implementation: `rateLimiter.ts`

```typescript
// Check rate limit (atomic operation)
const result = await checkRateLimit(
  context.auth.uid,
  'fetchLyrics',
  RATE_LIMITS.fetchLyrics  // 10 requests per minute
);

if (!result.allowed) {
  return {
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please try again later.',
    retryable: true,
    retryAfter: result.retryAfter, // Seconds to wait
  };
}
```

## Rate Limit Configurations

### Current Limits

| Action | Max Requests | Time Window | Purpose |
|--------|-------------|-------------|---------|
| `fetchLyrics` | 10 | 1 minute | Prevent lyrics scraping |
| `searchSongs` | 20 | 1 minute | Prevent API abuse |
| `saveSong` | 5 | 1 minute | Prevent spam |

### Adjusting Limits

Edit `functions/src/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  fetchLyrics: {
    maxRequests: 10,    // Increase/decrease as needed
    windowMs: 60 * 1000, // Change window size
  },
};
```

## Security Features

### 1. Atomic Operations

Uses Firestore transactions to prevent race conditions:
- Multiple simultaneous requests won't bypass limits
- Count increments are atomic
- Consistent across distributed systems

### 2. Fail-Safe Design

```typescript
catch (error) {
  // Fail open - allow request if rate limiter fails
  // Service availability > rate limiting
  return { allowed: true };
}
```

If Firestore is down, requests are allowed to maintain service availability.

### 3. Client Cannot Access Rate Limits

Firestore rules prevent client access:

```javascript
match /rateLimits/{userId} {
  allow read, write: if false; // NO client access
}
```

Users cannot:
- Check their rate limit status
- Reset their limits
- Manipulate rate limit data

### 4. Per-User Isolation

Each user has their own rate limit counters. One user's abuse doesn't affect others.

## Automatic Cleanup

Old rate limit documents are automatically cleaned up to save storage:

```typescript
// Run via scheduled function (daily)
cleanupRateLimits(); // Removes documents older than 24 hours
```

## Monitoring

### Log Messages

```
✅ Rate limit check passed. Remaining: 7
⚠️ Rate limit exceeded for user: abc123
```

### Firebase Console

View rate limit data:
```
Firestore → rateLimits collection
```

## Complementary Protections

### Client-Side Quota Display (UX, not security)

```typescript
// SongSelectionScreen.tsx
const MAX_SONGS_PER_LANGUAGE = 50;
const currentSongCount = language.songs?.length || 0;

if (currentSongCount >= MAX_SONGS_PER_LANGUAGE) {
  Alert.alert('Song Limit Reached', ...);
}
```

**This is for UX only** - real enforcement is server-side in Firestore rules and Functions.

### Input Size Limits

```python
# main.py
MAX_LYRICS_LENGTH = 50000
if len(lyrics) > MAX_LYRICS_LENGTH:
    return jsonify({'error': 'Lyrics too long'}), 400
```

Prevents resource exhaustion attacks.

### Cloud Run Concurrency Limits

```bash
gcloud run services update korean-analysis \
  --concurrency=10 \
  --max-instances=5
```

Prevents overwhelming the analysis service.

## Best Practices

### ✅ DO:
- Store all rate limit state server-side
- Use atomic transactions for count updates
- Fail open if rate limiter fails (availability > strict limiting)
- Log rate limit violations for monitoring
- Clean up old data periodically

### ❌ DON'T:
- Store rate limits on device (insecure)
- Trust client-reported rate limit status
- Block service if rate limiter fails (availability matters)
- Use same limits for all actions (tailor to abuse risk)
- Forget to clean up old documents (storage cost)

## Testing Rate Limits

### Manual Test

```bash
# Call function repeatedly (should get rate limited after 10 calls)
for i in {1..15}; do
  echo "Request $i"
  # Call fetchLyrics via app or Firebase CLI
  sleep 1
done
```

### Expected Behavior

- Requests 1-10: Success
- Requests 11+: Rate limit error with `retryAfter` in seconds

### Reset Test

```bash
# Wait 60 seconds, then call again
sleep 60
# Should succeed again
```

## Future Enhancements

### 1. Tiered Rate Limits

Different limits for different user tiers:
```typescript
const limits = user.premium
  ? RATE_LIMITS.premium
  : RATE_LIMITS.free;
```

### 2. IP-Based Rate Limiting

Additional layer for unauthenticated endpoints:
```typescript
checkRateLimit(request.ip, 'signup', config)
```

### 3. Adaptive Rate Limiting

Adjust limits based on system load:
```typescript
const multiplier = systemLoad < 50 ? 1.5 : 1.0;
config.maxRequests *= multiplier;
```

## Summary

**Key Points:**
- ✅ Server-side rate limiting using Firestore
- ✅ Atomic transactions prevent race conditions
- ✅ Cannot be bypassed by client manipulation
- ✅ Fail-safe design maintains availability
- ✅ Automatic cleanup saves storage
- ✅ Per-user isolation prevents cross-user impact

**Security Guarantee:**
Even if the app is fully reverse-engineered and modified, rate limits cannot be bypassed because all enforcement happens server-side.
