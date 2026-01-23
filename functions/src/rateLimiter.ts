/**
 * Rate Limiter - Server-side rate limiting using Firestore
 *
 * Prevents abuse by limiting API calls per user per time window.
 * Uses Firestore atomic operations for distributed rate limiting.
 */

import * as admin from 'firebase-admin';

export interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next allowed request
}

/**
 * Check if user is within rate limit
 *
 * @param userId - User ID to check
 * @param action - Action being rate limited (e.g., 'fetchLyrics')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Rate limit document path
  const rateLimitRef = db
    .collection('rateLimits')
    .doc(userId)
    .collection('actions')
    .doc(action);

  try {
    // Use transaction for atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data();

      // Initialize or reset if window expired
      if (!data || data.windowStart < windowStart) {
        const newData = {
          count: 1,
          windowStart: now,
          lastRequest: now,
        };
        transaction.set(rateLimitRef, newData);

        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now + config.windowMs),
        };
      }

      // Check if limit exceeded
      if (data.count >= config.maxRequests) {
        const resetAt = new Date(data.windowStart + config.windowMs);
        const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt: resetAt,
          retryAfter: retryAfter,
        };
      }

      // Increment count
      const newCount = data.count + 1;
      transaction.update(rateLimitRef, {
        count: newCount,
        lastRequest: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - newCount,
        resetAt: new Date(data.windowStart + config.windowMs),
      };
    });

    return result;
  } catch (error: any) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    // This prevents rate limiter from blocking service if Firestore has issues
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Fetch lyrics: 10 requests per minute per user
  fetchLyrics: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Search songs: 20 requests per minute per user
  searchSongs: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },

  // Save song: 5 requests per minute per user
  saveSong: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Clean up old rate limit documents (run periodically via scheduled function)
 * Removes documents older than 24 hours
 */
export async function cleanupRateLimits(): Promise<number> {
  const db = admin.firestore();
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

  let deletedCount = 0;

  try {
    // Get all rate limit user documents
    const usersSnapshot = await db.collection('rateLimits').get();

    for (const userDoc of usersSnapshot.docs) {
      const actionsSnapshot = await userDoc.ref.collection('actions').get();

      for (const actionDoc of actionsSnapshot.docs) {
        const data = actionDoc.data();

        if (data.lastRequest < cutoff) {
          await actionDoc.ref.delete();
          deletedCount++;
        }
      }

      // Delete user document if no actions left
      const remainingActions = await userDoc.ref.collection('actions').get();
      if (remainingActions.empty) {
        await userDoc.ref.delete();
      }
    }

    console.log(`Cleaned up ${deletedCount} old rate limit documents`);
    return deletedCount;
  } catch (error: any) {
    console.error('Rate limit cleanup failed:', error);
    return deletedCount;
  }
}
