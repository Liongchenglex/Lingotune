/**
 * Music Feature - Type Definitions
 *
 * This file defines all TypeScript interfaces for the Learn with Music feature.
 * These types match the data models defined in docs/features/learnmusic/requirements.md
 */

import { Timestamp } from 'firebase/firestore';
import { LanguageCode } from './onboarding';

/**
 * Extended song data with lyrics and validation metadata
 * Stored in Firestore: songs/{songId}
 */
export interface Song {
  id: string;                     // Spotify track ID (document ID)
  title: string;
  artist: string;
  album: string;
  albumArt: string;               // URL to album cover (640x640)
  duration: number;               // milliseconds
  spotifyUri: string;             // spotify:track:xxxxx
  previewUrl: string | null;      // 30s preview URL from Spotify (may be null)

  // Lyrics data
  lyricsSource: 'genius';         // Source of lyrics
  geniusId: string;               // Genius song ID (for attribution)
  geniusUrl: string;              // URL to Genius page
  lyricsLanguage: LanguageCode;   // Detected language
  lyricsConfidence: number;       // 0-1 from language detection

  // Metadata
  language: LanguageCode;         // User's target language (for filtering)
  addedAt: Timestamp;

  // Optional override flag (when user manually overrides language validation)
  manualOverride?: boolean;

  // NOTE: Full lyrics are NOT stored (copyright)
}

/**
 * Song search result from Spotify API
 * Used in SongSelectionScreen before validation
 */
export interface SpotifyTrack {
  id: string;                     // Spotify track ID
  title: string;                  // Track name
  artist: string;                 // Primary artist name
  album: string;                  // Album name
  albumArt: string;               // URL to album cover
  duration: number;               // milliseconds
  spotifyUri: string;             // spotify:track:xxxxx
  previewUrl: string | null;      // 30s preview URL (may be null)
}

/**
 * Search songs API response
 */
export interface SearchSongsResponse {
  tracks: SpotifyTrack[];
  total: number;                  // Total results available in Spotify
}

/**
 * Fetch lyrics API response
 */
export interface FetchLyricsResponse {
  lyrics: string;                 // Plain text lyrics (newlines preserved)
  source: 'genius';               // Source of lyrics
  geniusId: string;               // Genius song ID
  geniusUrl: string;              // URL to Genius page
}

/**
 * Language detection result from franc library
 */
export interface LanguageDetectionResult {
  language: LanguageCode | 'unknown';
  confidence: number;             // 0-1
}

/**
 * Language validation result (after checking against target language)
 */
export interface LanguageValidationResult {
  valid: boolean;
  detected: LanguageCode | 'unknown';
  confidence: number;             // 0-1
  reason?: string;                // If invalid, why?
}

/**
 * API error response (standardized across all music APIs)
 */
export interface MusicAPIError {
  error: 'api_unavailable' | 'rate_limit' | 'invalid_query' | 'network_error' |
         'lyrics_not_found' | 'scraping_failed' | 'unknown_language' |
         'wrong_language' | 'low_confidence' | 'auth_expired' | 'storage_failed';
  message: string;                // User-friendly error message
  retryable: boolean;             // Can user retry this operation?
  technicalDetails?: string;      // For logging/debugging
}

/**
 * Generated vocabulary for a song (Phase 2 - deferred)
 * Stored in Firestore: userSongs/{userId}/songs/{songId}/vocabulary
 */
export interface SongVocabulary {
  songId: string;                 // References Song.id
  userId: string;
  language: LanguageCode;

  vocabulary: VocabularyItem[];

  generatedAt: Timestamp;
  generatedBy: 'claude' | 'gpt';  // AI provider used
  profileSnapshot: string;        // Snapshot of currentProfile at generation time
}

/**
 * Individual vocabulary item extracted from song lyrics (Phase 2 - deferred)
 */
export interface VocabularyItem {
  id: string;                     // Auto-generated
  word: string;                   // Original word/phrase in target language
  translation: string;            // English translation
  context: string;                // Line from lyrics where it appears
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  partOfSpeech: string;           // noun, verb, adjective, etc.
  culturalNote?: string;          // Optional cultural context

  // Learning progress (for Feature 4 integration)
  learned: boolean;
  masteryLevel: number;           // 0-5 (spaced repetition)
  lastReviewedAt?: Timestamp;
  nextReviewAt?: Timestamp;
}
