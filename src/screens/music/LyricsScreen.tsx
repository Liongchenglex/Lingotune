/**
 * LyricsScreen
 *
 * Displays song lyrics with interactive analysis features:
 * - Tokenized lyrics (tappable words)
 * - Vocabulary details
 * - Grammar pattern detection
 * - Romanization
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useAnalysis, Token, GrammarPattern } from '../../hooks/useAnalysis';
import { AnalysisStatusBanner } from '../../components/music/AnalysisStatusBanner';
import { TokenizedLyrics } from '../../components/music/TokenizedLyrics';
import { TokenDetailBottomSheet } from '../../components/music/TokenDetailBottomSheet';
import { GrammarPatternBottomSheet } from '../../components/music/GrammarPatternBottomSheet';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
}

interface LyricsScreenProps {
  songId: string;
  onBack: () => void;
}

export const LyricsScreen: React.FC<LyricsScreenProps> = ({ songId, onBack }) => {
  const [song, setSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis data
  const analysis = useAnalysis(songId);

  // Bottom sheet state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedGrammarPatterns, setSelectedGrammarPatterns] = useState<GrammarPattern[]>([]);

  useEffect(() => {
    if (songId) {
      loadSongAndLyrics();
    }
  }, [songId]);

  const loadSongAndLyrics = async () => {
    if (!songId) {
      setError('No song selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch song data from Firestore
      const db = getFirestore();
      const songDoc = await getDoc(doc(db, 'songs', songId));

      if (!songDoc.exists()) {
        setError('Song not found');
        setLoading(false);
        return;
      }

      const songData = songDoc.data() as Song;
      setSong(songData);

      // Fetch lyrics from Firebase Function
      const functions = getFunctions();
      const fetchLyrics = httpsCallable(functions, 'fetchLyrics');

      const result = await fetchLyrics({
        songId: songData.id,
        title: songData.title,
        artist: songData.artist,
      });

      const data = result.data as any;

      if (data.error) {
        setError(data.message || 'Failed to load lyrics');
        return;
      }

      setLyrics(data.lyrics || '');
    } catch (err: any) {
      console.error('Load song and lyrics error:', err);
      setError('Failed to load song. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!song && !loading) {
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
          <TouchableOpacity style={styles.retryButton} onPress={loadSongAndLyrics}>
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
          <Text style={styles.headerSubtitle}>{song.title}</Text>
          <Text style={styles.headerArtist}>{song.artist}</Text>
        </View>
      </View>

      {/* Lyrics Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Analysis Status Banner */}
        <AnalysisStatusBanner analysis={analysis} />

        {/* Lyrics Container */}
        <View style={styles.lyricsContainer}>
          {analysis.status === 'complete' && analysis.tokenization ? (
            /* Interactive Tokenized Lyrics */
            <TokenizedLyrics
              tokens={analysis.tokenization.tokens}
              grammarPatterns={analysis.grammar?.patterns || []}
              romanizations={analysis.pronunciation?.romanizations || []}
              vocabularyWords={analysis.vocabulary?.words || []}
              onTokenPress={(token) => {
                setSelectedToken(token);
              }}
              onGrammarPress={(patterns) => {
                setSelectedGrammarPatterns(patterns);
              }}
            />
          ) : (
            /* Plain Lyrics Fallback */
            <Text style={styles.lyricsText}>{lyrics}</Text>
          )}
        </View>
      </ScrollView>

      {/* Token Detail Bottom Sheet */}
      <TokenDetailBottomSheet
        visible={selectedToken !== null}
        token={selectedToken}
        vocabularyWords={analysis.vocabulary?.words || []}
        onClose={() => {
          setSelectedToken(null);
        }}
      />

      {/* Grammar Pattern Bottom Sheet */}
      <GrammarPatternBottomSheet
        visible={selectedGrammarPatterns.length > 0}
        patterns={selectedGrammarPatterns}
        onClose={() => setSelectedGrammarPatterns([])}
      />
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
});
