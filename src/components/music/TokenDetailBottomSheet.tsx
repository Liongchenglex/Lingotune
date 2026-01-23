/**
 * TokenDetailBottomSheet
 *
 * Shows detailed information about a tapped token:
 * - Morpheme and romanization
 * - Part of speech
 * - Meaning (placeholder for now - will integrate dictionary in Phase 2A.2)
 * - Frequency in song
 * - Option to add to flashcards (placeholder)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Token, VocabularyWord } from '../../hooks/useAnalysis';

interface TokenDetailBottomSheetProps {
  visible: boolean;
  token: Token | null;
  vocabularyWords: VocabularyWord[];
  onClose: () => void;
}

export const TokenDetailBottomSheet: React.FC<TokenDetailBottomSheetProps> = ({
  visible,
  token,
  vocabularyWords,
  onClose,
}) => {
  // Find vocabulary word data for this token
  const vocabularyData = useMemo<VocabularyWord | null>(() => {
    if (!token) return null;
    return vocabularyWords.find((w) => w.word === token.morpheme) || null;
  }, [token, vocabularyWords]);

  if (!token) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Drag indicator */}
            <View style={styles.dragIndicator} />

            {/* Word */}
            <Text style={styles.word}>{token.morpheme}</Text>

            {/* Part of Speech */}
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>🏷️ Type</Text>
              <Text style={styles.metadataValue}>
                {formatPOS(token.pos)}
              </Text>
            </View>

            {/* Frequency */}
            {vocabularyData && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>📊 Frequency</Text>
                <Text style={styles.metadataValue}>
                  Appears {vocabularyData.count} {vocabularyData.count === 1 ? 'time' : 'times'}
                </Text>
              </View>
            )}

            {/* Meaning */}
            <View style={styles.meaningSection}>
              <Text style={styles.meaningLabel}>📝 Meaning</Text>
              {vocabularyData?.definition?.ko ? (
                <>
                  <Text style={styles.meaningText}>
                    🇰🇷 {vocabularyData.definition.ko}
                  </Text>
                  {vocabularyData.definition.en && (
                    <Text style={[styles.meaningText, { marginTop: 8 }]}>
                      🇬🇧 {vocabularyData.definition.en}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.meaningPlaceholder}>
                  Dictionary definitions coming in Phase 2A.2
                </Text>
              )}
            </View>

            {/* Example Lines - Show line indices if lines array not available */}
            {vocabularyData && vocabularyData.lineIndices && vocabularyData.lineIndices.length > 0 && (
              <View style={styles.examplesSection}>
                <Text style={styles.examplesLabel}>💬 Found in lines:</Text>
                <Text style={styles.lineIndicesText}>
                  {vocabularyData.lineIndices.slice(0, 10).map(idx => idx + 1).join(', ')}
                  {vocabularyData.lineIndices.length > 10 && ` +${vocabularyData.lineIndices.length - 10} more`}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  // TODO: Implement in Phase 2A.2
                  onClose();
                }}
              >
                <Text style={styles.addButtonText}>Add to Flashcards</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

// Helper function to format POS tags to readable text
const formatPOS = (pos: string): string => {
  const posMap: Record<string, string> = {
    noun: 'Noun',
    verb: 'Verb',
    adjective: 'Adjective',
    adverb: 'Adverb',
    particle: 'Particle',
    ending: 'Verb Ending',
    pronoun: 'Pronoun',
    determiner: 'Determiner',
    number: 'Number',
    punctuation: 'Punctuation',
    foreign: 'Foreign Word',
    alphabet: 'Alphabet',
    unknown: 'Unknown',
    conjunction: 'Conjunction',
    exclamation: 'Exclamation',
    suffix: 'Suffix',
    'pre-ending': 'Pre-Ending',
  };

  return posMap[pos] || pos.charAt(0).toUpperCase() + pos.slice(1);
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  word: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  meaningSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  meaningLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  meaningPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  meaningText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  examplesSection: {
    marginTop: 20,
  },
  examplesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  exampleItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  exampleBullet: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  moreExamples: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  lineIndicesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
