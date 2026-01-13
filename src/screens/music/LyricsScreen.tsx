/**
 * LyricsScreen
 *
 * Displays song lyrics for the currently selected song.
 * Shows full lyrics in a scrollable view.
 *
 * Phase 2 will add vocabulary highlighting and learning features.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CurrentSong } from '../../types/onboarding';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface LyricsScreenProps {
  onBack: () => void;
}

export const LyricsScreen: React.FC<LyricsScreenProps> = ({ onBack }) => {
  const { currentLanguage } = useOnboarding();
  const [lyrics, setLyrics] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentSong: CurrentSong | undefined = currentLanguage?.currentSong;

  useEffect(() => {
    if (currentSong) {
      loadLyrics();
    }
  }, [currentSong]);

  const loadLyrics = async () => {
    if (!currentSong) {
      setError('No song selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const functions = getFunctions();
      const fetchLyrics = httpsCallable(functions, 'fetchLyrics');

      const result = await fetchLyrics({
        songId: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
      });

      const data = result.data as any;

      if (data.error) {
        setError(data.message || 'Failed to load lyrics');
        return;
      }

      setLyrics(data.lyrics || '');
    } catch (err: any) {
      console.error('Load lyrics error:', err);
      setError('Failed to load lyrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lyrics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌</Text>
          <Text style={styles.errorText}>No song selected</Text>
          <TouchableOpacity style={styles.backToDashboardButton} onPress={onBack}>
            <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lyrics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading lyrics...</Text>
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
          <Text style={styles.headerTitle}>Lyrics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLyrics}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Lyrics</Text>
          <Text style={styles.headerSubtitle}>{currentSong.title}</Text>
          <Text style={styles.headerArtist}>{currentSong.artist}</Text>
        </View>
      </View>

      {/* Lyrics Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.lyricsContainer}>
          <Text style={styles.lyricsText}>{lyrics}</Text>
        </View>

        {/* Phase 2 Placeholder */}
        <View style={styles.phase2Notice}>
          <Text style={styles.phase2Icon}>🎯</Text>
          <Text style={styles.phase2Title}>Coming Soon: Vocabulary Learning</Text>
          <Text style={styles.phase2Text}>
            In the next phase, you'll be able to:
          </Text>
          <Text style={styles.phase2List}>
            • Tap words to see translations{'\n'}
            • Learn vocabulary from lyrics{'\n'}
            • Track your progress{'\n'}
            • Practice with flashcards
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerArtist: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
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
  backToDashboardButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToDashboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  lyricsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lyricsText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1F2937',
    fontFamily: 'System',
  },
  phase2Notice: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  phase2Icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  phase2Title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  phase2Text: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  phase2List: {
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 22,
    textAlign: 'left',
  },
});
