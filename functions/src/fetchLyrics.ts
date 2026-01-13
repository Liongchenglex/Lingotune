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
    console.log('🎤🎤🎤 NEW FETCH LYRICS VERSION 2026-01-13 🎤🎤🎤');
    console.log('========================================');
    console.log('fetchLyrics CALLED - HARDCODED VERSION');
    console.log('Data received:', JSON.stringify(data, null, 2));
    console.log('Auth:', context.auth ? 'authenticated' : 'not authenticated');
    console.log('========================================');

    // Authentication check
    if (!context.auth) {
      console.log('ERROR: No authentication');
      return {
        error: 'lyrics_not_found',
        message: 'Authentication required',
        retryable: false,
      };
    }

    // Validate input
    if (!data.songId) {
      console.log('ERROR: No songId provided');
      return {
        error: 'lyrics_not_found',
        message: 'Missing required field: songId',
        retryable: false,
      };
    }

    try {
      // Load songs from JSON
      const allSongs: HardcodedSong[] = (songsData as any).default || songsData;
      console.log('Total songs loaded from JSON:', allSongs.length);

      // Find song by ID
      const song = allSongs.find(s => s.id === data.songId);
      console.log('Song found:', song ? `${song.title} by ${song.artist}` : 'NOT FOUND');

      if (!song) {
        console.log('ERROR: Song not found with ID:', data.songId);
        return {
          error: 'lyrics_not_found',
          message: 'Song not found. Please try another song.',
          retryable: false,
          technicalDetails: `No song found with ID: ${data.songId}`,
        };
      }

      const lyricsLength = song.lyrics?.trim().length || 0;
      console.log('Lyrics length:', lyricsLength, 'characters');

      if (!song.lyrics || lyricsLength < 50) {
        console.log('ERROR: Lyrics too short or missing');
        return {
          error: 'lyrics_not_found',
          message: 'Lyrics not available for this song.',
          retryable: false,
          technicalDetails: `Song ${data.songId} has no lyrics or lyrics too short`,
        };
      }

      console.log('✅ SUCCESS: Returning lyrics');
      console.log('Lyrics preview (first 100 chars):', song.lyrics.substring(0, 100) + '...');
      console.log('🎤🎤🎤 END FETCH LYRICS VERSION 🎤🎤🎤');
      console.log('========================================');

      return {
        lyrics: song.lyrics,
        source: 'hardcoded',
        geniusId: song.id,
        geniusUrl: `https://example.com/song/${song.id}`, // Placeholder
      };
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR in fetchLyrics:');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('========================================');
      return {
        error: 'api_unavailable',
        message: 'Failed to load lyrics. Please try again.',
        retryable: true,
        technicalDetails: error.message,
      };
    }
  }
);
