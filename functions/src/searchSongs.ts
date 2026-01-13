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
    // Authentication check
    if (!context.auth) {
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

      // Load songs from JSON
      const allSongs: HardcodedSong[] = (songsData as any).default || songsData;

      // Filter songs
      let filteredSongs = allSongs;

      // Filter by language if specified
      if (language) {
        filteredSongs = filteredSongs.filter(song => song.language === language);
      }

      // Filter by search query if specified
      if (query.length >= 2) {
        filteredSongs = filteredSongs.filter(song =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query)
        );
      }

      // Apply limit
      const limitedSongs = filteredSongs.slice(0, limit);

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

      return {
        tracks,
        total: filteredSongs.length,
      };
    } catch (error: any) {
      console.error('Search songs error:', error.message);
      return {
        error: 'api_unavailable',
        message: 'Failed to load songs. Please try again.',
        retryable: true,
        technicalDetails: error.message,
      };
    }
  }
);
