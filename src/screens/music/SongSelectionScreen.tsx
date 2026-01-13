/**
 * SongSelectionScreen
 *
 * Allows users to browse and select songs in their target language.
 * MVP Version: Shows hardcoded songs filtered by language.
 *
 * Reference: docs/features/learnmusic/requirements.md Section 3.B
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validateSongLanguage, formatConfidence, getLanguageName } from '../../utils/languageDetection';
import { SpotifyTrack, LanguageValidationResult } from '../../types/music';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, writeBatch, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';

interface SongSelectionScreenProps {
  language: import('../../types/onboarding').UserLanguage;
  onBack: () => void;
  onSongSelected: (songId: string) => void;
}

export const SongSelectionScreen: React.FC<SongSelectionScreenProps> = ({ language, onBack, onSongSelected }) => {
  const { user } = useAuth();
  const { userProfile, refreshUserProfile } = useOnboarding();
  const [songs, setSongs] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);

  // Load songs on mount
  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      setError(null);

      const functions = getFunctions();
      const searchSongs = httpsCallable(functions, 'searchSongs');

      // Search for songs in user's target language
      const result = await searchSongs({
        language: language?.languageCode,
        limit: 20,
      });

      const data = result.data as any;

      if (data.error) {
        setError(data.message || 'Failed to load songs');
        return;
      }

      setSongs(data.tracks || []);
    } catch (err: any) {
      console.error('Load songs error:', err);
      setError('Failed to load songs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSongPress = (song: SpotifyTrack) => {
    setSelectedSong(song);

    // Show confirmation dialog
    Alert.alert(
      'Confirm Selection',
      `${song.title}\nby ${song.artist}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedSong(null),
        },
        {
          text: 'Confirm',
          onPress: () => handleConfirmSelection(song),
        },
      ]
    );
  };

  const handleConfirmSelection = async (song: SpotifyTrack) => {
    try {
      setFetchingLyrics(true);

      // Step 1: Fetch lyrics
      const functions = getFunctions();
      const fetchLyrics = httpsCallable(functions, 'fetchLyrics');

      const lyricsResult = await fetchLyrics({
        songId: song.id,
        title: song.title,
        artist: song.artist,
      });

      const lyricsData = lyricsResult.data as any;

      if (lyricsData.error) {
        Alert.alert(
          'Lyrics Not Available',
          lyricsData.message || 'We couldn\'t find lyrics for this song.',
          [{ text: 'Try Another Song', onPress: () => setSelectedSong(null) }]
        );
        return;
      }

      const lyrics = lyricsData.lyrics;

      // Step 2: Validate language
      const validation: LanguageValidationResult = validateSongLanguage(
        lyrics,
        language!.languageCode
      );

      // Handle validation results - ALWAYS allow user to proceed
      // Show informative warnings but never block
      if (validation.valid) {
        // Language valid - proceed directly
        await saveSong(song, lyrics, validation, lyricsData);
        onSongSelected(song.id);
      } else {
        // Show friendly warning for any validation issue
        let warningMessage = '';

        if (validation.reason === 'wrong_language' && validation.detected && validation.detected !== 'unknown') {
          warningMessage = `Don't worry - our AI isn't perfect! If you're confident this is the right language, feel free to add it.\n\nOur AI detected this song might be in ${getLanguageName(validation.detected)}, but you're learning ${getLanguageName(language!.languageCode)}.`;
        } else if (validation.reason === 'low_confidence' || !validation.detected || validation.detected === 'unknown') {
          warningMessage = `Don't let this stop you! If you know this song is in ${getLanguageName(language!.languageCode)}, go ahead and add it.\n\nOur AI couldn't confidently detect the language of this song.\n\nThis might be because:\n• The song uses slang or colloquial expressions\n• It mixes multiple languages\n• The lyrics are unique or poetic`;
        } else if (validation.reason === 'medium_confidence_warning' && validation.detected && validation.detected !== 'unknown') {
          warningMessage = `Our AI is ${formatConfidence(validation.confidence)} confident this song is in ${getLanguageName(validation.detected)}.\n\nLanguage detection isn't always accurate, especially with songs that use slang, loan words, or poetic language.`;
        } else {
          // Fallback for any other case
          warningMessage = `Don't worry - this is common with songs! If you know this song is in ${getLanguageName(language!.languageCode)}, feel free to add it.\n\nOur language detection had some uncertainty with this song.`;
        }

        Alert.alert(
          '⚠️ Language Detection Note',
          warningMessage + '\n\nWould you like to add this song?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSelectedSong(null) },
            {
              text: 'Add Song',
              onPress: async () => {
                await saveSong(song, lyrics, validation, lyricsData);
                onSongSelected(song.id);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Confirm selection error:', err);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK', onPress: () => setSelectedSong(null) }]
      );
    } finally {
      setFetchingLyrics(false);
    }
  };

  const saveSong = async (
    song: SpotifyTrack,
    lyrics: string,
    validation: LanguageValidationResult,
    lyricsData: any
  ) => {
    if (!user || !userProfile || !language) {
      throw new Error('User not authenticated or profile not loaded');
    }

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // Save song metadata to songs collection
      const songRef = doc(db, 'songs', song.id);
      batch.set(songRef, {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumArt: song.albumArt,
        duration: song.duration,
        spotifyUri: song.spotifyUri,
        previewUrl: song.previewUrl,
        lyricsSource: lyricsData.source,
        geniusId: lyricsData.geniusId,
        geniusUrl: lyricsData.geniusUrl,
        lyricsLanguage: validation.detected,
        lyricsConfidence: validation.confidence,
        language: language.languageCode,
        addedAt: Timestamp.now(),
      }, { merge: true });

      await batch.commit();

      // Update user's currentSong
      // IMPORTANT: We must update the entire languages array to avoid Firestore
      // replacing the language object. Field path syntax (languages.0.field)
      // replaces the entire element instead of merging.
      const userRef = doc(db, 'users', user.uid);

      // Find the index of the current language in the languages array
      const languageIndex = userProfile.languages.findIndex(
        lang => lang.languageCode === language.languageCode
      );

      if (languageIndex === -1) {
        throw new Error('Current language not found in user profile');
      }

      // Clone and update the entire languages array
      const updatedLanguages = userProfile.languages.map((lang, idx) => {
        if (idx === languageIndex) {
          // Add song metadata to the songs array (avoid duplicates)
          const existingSongs = lang.songs || [];
          const songExists = existingSongs.some(s => s.id === song.id);

          const newSongs = songExists
            ? existingSongs // Already added, don't duplicate
            : [...existingSongs, {
                id: song.id,
                title: song.title,
                artist: song.artist,
                addedAt: Timestamp.now(),
              }]; // Add to end of array

          return {
            ...lang,
            songs: newSongs,
            lastUpdated: Timestamp.now(),
          };
        }
        return lang;
      });

      // Write the entire updated array
      await updateDoc(userRef, {
        languages: updatedLanguages,
      });

      // Refresh user profile to get updated data
      await refreshUserProfile();

      Alert.alert('Success!', 'Song added successfully!');
    } catch (err: any) {
      console.error('Save song error:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Song Selection</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading songs...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Song Selection</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSongs}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (fetchingLyrics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Song Selection</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching lyrics...</Text>
          <Text style={styles.loadingSubtext}>Validating language...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Song Selection</Text>
      </View>

      {/* Song List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {songs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateTitle}>No songs found</Text>
            <Text style={styles.emptyStateText}>
              We couldn't find any songs for your language.{'\n'}
              Please try again later.
            </Text>
          </View>
        ) : (
          songs.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={styles.songCard}
              onPress={() => handleSongPress(song)}
              activeOpacity={0.7}
            >
              <View style={styles.songInfo}>
                <Text style={styles.songTitle}>{song.title}</Text>
                <Text style={styles.songArtist}>{song.artist}</Text>
                {song.album && (
                  <Text style={styles.songAlbum}>{song.album}</Text>
                )}
              </View>
              <Text style={styles.songChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  songChevron: {
    fontSize: 24,
    color: '#D1D5DB',
    marginLeft: 8,
  },
});
