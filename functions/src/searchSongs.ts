/**
 * searchSongs Firebase Function
 *
 * MVP VERSION: Returns hardcoded songs from JSON file.
 * This bypasses API integration issues (Apple Music/Spotify) for faster development.
 * Can be replaced with real API calls later.
 *
 * Reference: docs/features/learnmusic/requirements.md Section 7.A
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
interface SearchSongsRequest {
  query?: string;       // Search query (optional for hardcoded mode)
  language?: string;    // Filter by language (ko, zh, ja, es)
  limit?: number;       // Max results (default: 20, max: 50)
}

/**
 * Response interface (matches requirements.md Section 7.A)
 */
interface SearchSongsResponse {
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    albumArt: string;
    duration: number;
    spotifyUri: string;
    previewUrl: string | null;
  }>;
  total: number;
}

/**
 * Error response interface
 */
interface SearchSongsError {
  error: 'api_unavailable' | 'rate_limit' | 'invalid_query' | 'network_error' | 'missing_credentials';
  message: string;
  retryable: boolean;
  technicalDetails?: string;
}

/**
 * Search songs from hardcoded JSON file
 * Filters by language and optionally by search query
 */
export const searchSongs = functions.https.onCall(
  async (data: SearchSongsRequest, context): Promise<SearchSongsResponse | SearchSongsError> => {
    console.log('🚀🚀🚀 NEW FUNCTION VERSION 2026-01-13 10:00 AM 🚀🚀🚀');
    console.log('========================================');
    console.log('searchSongs CALLED - LATEST VERSION WITH NO QUERY VALIDATION');
    console.log('Data received:', JSON.stringify(data, null, 2));
    console.log('Auth:', context.auth ? 'authenticated' : 'not authenticated');
    console.log('========================================');

    // Authentication check
    if (!context.auth) {
      console.log('ERROR: No authentication');
      return {
        error: 'invalid_query',
        message: 'Authentication required',
        retryable: false,
      };
    }

    try {
      const query = data.query?.trim().toLowerCase() || '';
      const language = data.language;
      const limit = data.limit || 20;

      console.log('Parsed params:');
      console.log('  - query:', query);
      console.log('  - language:', language);
      console.log('  - limit:', limit);

      // Load songs from JSON
      const allSongs: HardcodedSong[] = (songsData as any).default || songsData;
      console.log('Total songs loaded from JSON:', allSongs.length);

      // Filter songs
      let filteredSongs = allSongs;

      // Filter by language if specified
      if (language) {
        filteredSongs = filteredSongs.filter(song => song.language === language);
        console.log(`After language filter (${language}):`, filteredSongs.length, 'songs');
      }

      // REMOVED: Query validation - allow any query length including empty
      // Filter by search query if specified (NO LENGTH CHECK)
      if (query.length > 0) {
        console.log('Applying search query filter (any length)');
        filteredSongs = filteredSongs.filter(song =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query)
        );
        console.log('After query filter:', filteredSongs.length, 'songs');
      } else {
        console.log('No query provided, returning all songs for language');
      }

      // Apply limit
      const limitedSongs = filteredSongs.slice(0, limit);
      console.log('After limit:', limitedSongs.length, 'songs');

      // Transform to match our Song interface (exclude lyrics from response)
      const tracks = limitedSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumArt: song.albumArt || '', // Empty for now
        duration: song.duration,
        spotifyUri: `hardcoded:song:${song.id}`,
        previewUrl: null, // No preview for hardcoded songs
      }));

      console.log('✅ SUCCESS: Returning', tracks.length, 'tracks');
      console.log('🚀🚀🚀 END NEW FUNCTION VERSION 🚀🚀🚀');
      console.log('========================================');

      return {
        tracks,
        total: filteredSongs.length,
      };
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR in searchSongs:');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('========================================');
      return {
        error: 'api_unavailable',
        message: 'Failed to load songs. Please try again.',
        retryable: true,
        technicalDetails: error.message,
      };
    }
  }
);
