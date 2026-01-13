/**
 * fetchLyrics Firebase Function
 *
 * MVP VERSION: Returns hardcoded lyrics from JSON file.
 * This bypasses Genius API integration issues for faster development.
 * Can be replaced with real API calls later.
 *
 * Reference: docs/features/learnmusic/requirements.md Section 7.B
 */

import * as functions from 'firebase-functions';
import * as songsData from '../data/songs.json';

/**
 * Song data from JSON file
 */
interface HardcodedSong {
  id: string;
  title: string;
  artist: string;
  language: string;
  album: string;
  albumArt: string;
  duration: number;
  lyrics: string;
}

/**
 * Request interface
 */
interface FetchLyricsRequest {
  songId: string;     // Song ID from our hardcoded data
  title: string;      // Song title (for reference)
  artist: string;     // Artist name (for reference)
  album?: string;     // Album name (optional)
}

/**
 * Response interface (matches requirements.md Section 7.B)
 */
interface FetchLyricsResponse {
  lyrics: string;       // Plain text lyrics (newlines preserved)
  source: 'hardcoded';  // Source of lyrics (hardcoded for MVP)
  geniusId: string;     // Song ID (not from Genius in MVP)
  geniusUrl: string;    // Placeholder URL
}

/**
 * Error response interface
 */
interface FetchLyricsError {
  error: 'lyrics_not_found' | 'api_unavailable';
  message: string;
  retryable: boolean;
  technicalDetails?: string;
}

/**
 * Fetch lyrics for a song from hardcoded data
 */
export const fetchLyrics = functions.https.onCall(
  async (data: FetchLyricsRequest, context): Promise<FetchLyricsResponse | FetchLyricsError> => {
    // Authentication check
    if (!context.auth) {
      return {
        error: 'lyrics_not_found',
        message: 'Authentication required',
        retryable: false,
      };
    }

    // Validate input
    if (!data.songId) {
      return {
        error: 'lyrics_not_found',
        message: 'Missing required field: songId',
        retryable: false,
      };
    }

    try {
      // Load songs from JSON
      const allSongs: HardcodedSong[] = (songsData as any).default || songsData;

      // Find song by ID
      const song = allSongs.find(s => s.id === data.songId);

      if (!song) {
        return {
          error: 'lyrics_not_found',
          message: 'Song not found. Please try another song.',
          retryable: false,
          technicalDetails: `No song found with ID: ${data.songId}`,
        };
      }

      if (!song.lyrics || song.lyrics.trim().length < 50) {
        return {
          error: 'lyrics_not_found',
          message: 'Lyrics not available for this song.',
          retryable: false,
          technicalDetails: `Song ${data.songId} has no lyrics or lyrics too short`,
        };
      }

      return {
        lyrics: song.lyrics,
        source: 'hardcoded',
        geniusId: song.id,
        geniusUrl: `https://example.com/song/${song.id}`, // Placeholder
      };
    } catch (error: any) {
      console.error('Fetch lyrics error:', error.message);
      return {
        error: 'api_unavailable',
        message: 'Failed to load lyrics. Please try again.',
        retryable: true,
        technicalDetails: error.message,
      };
    }
  }
);
