/**
 * TokenizedLyrics
 *
 * Displays lyrics as interactive tokens.
 * Each token (morpheme) is tappable to show details.
 * Grammar patterns are indicated with info icons per line.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Token,
  GrammarPattern,
  Romanization,
  VocabularyWord,
} from '../../hooks/useAnalysis';

interface TokenizedLyricsProps {
  tokens: Token[];
  grammarPatterns: GrammarPattern[];
  romanizations: Romanization[];
  vocabularyWords: VocabularyWord[];
  onTokenPress: (token: Token) => void;
  onGrammarPress: (linePatterns: GrammarPattern[]) => void;
}

interface LineData {
  lineIndex: number;
  tokens: Token[];
  romanization?: string;
  hasGrammar: boolean;
  grammarPatterns: GrammarPattern[];
}

export const TokenizedLyrics: React.FC<TokenizedLyricsProps> = ({
  tokens,
  grammarPatterns,
  romanizations,
  vocabularyWords,
  onTokenPress,
  onGrammarPress,
}) => {
  // Track which lines have romanization visible (default: all visible)
  const [hiddenRomanizationLines, setHiddenRomanizationLines] = useState<Set<number>>(new Set());

  const toggleLineRomanization = (lineIndex: number) => {
    setHiddenRomanizationLines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lineIndex)) {
        newSet.delete(lineIndex);
      } else {
        newSet.add(lineIndex);
      }
      return newSet;
    });
  };
  // Group tokens by line and attach romanization + grammar info
  const lines = useMemo<LineData[]>(() => {
    const lineMap = new Map<number, LineData>();

    // Group tokens by line
    tokens.forEach((token) => {
      if (!lineMap.has(token.lineIndex)) {
        lineMap.set(token.lineIndex, {
          lineIndex: token.lineIndex,
          tokens: [],
          hasGrammar: false,
          grammarPatterns: [],
        });
      }
      lineMap.get(token.lineIndex)!.tokens.push(token);
    });

    // Add romanization
    romanizations.forEach((r, index) => {
      if (lineMap.has(index)) {
        lineMap.get(index)!.romanization = r.romanization;
      }
    });

    // Add grammar patterns
    grammarPatterns.forEach((pattern) => {
      // Each pattern can appear on multiple lines
      pattern.lineIndices.forEach((lineIndex) => {
        if (lineMap.has(lineIndex)) {
          const lineData = lineMap.get(lineIndex)!;
          lineData.hasGrammar = true;
          lineData.grammarPatterns.push(pattern);
        }
      });
    });

    // Convert to sorted array
    return Array.from(lineMap.values()).sort((a, b) => a.lineIndex - b.lineIndex);
  }, [tokens, romanizations, grammarPatterns]);

  // Note: We don't provide per-token romanization because the pronunciation
  // data from Firebase is at the line level, not token level.
  // Token-to-romanization mapping would require complex phonetic alignment.

  // Helper function to check if token is a vocabulary word
  const isVocabularyWord = (token: Token): boolean => {
    return vocabularyWords.some((word) => word.word === token.morpheme);
  };

  return (
    <View style={styles.container}>
      {lines.map((line) => (
        <View key={line.lineIndex} style={styles.lineContainer}>
          <View style={styles.tokensRow}>
            {/* Tokens */}
            {line.tokens.map((token, index) => {
              const isVocab = isVocabularyWord(token);

              return (
                <TouchableOpacity
                  key={`${line.lineIndex}-${index}`}
                  onPress={() => onTokenPress(token)}
                  style={styles.tokenWrapper}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.token,
                      isVocab && styles.vocabularyToken,
                    ]}
                  >
                    {token.morpheme}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Grammar info icon */}
            {line.hasGrammar && (
              <TouchableOpacity
                onPress={() => onGrammarPress(line.grammarPatterns)}
                style={styles.grammarButton}
                activeOpacity={0.7}
              >
                <Text style={styles.grammarIcon}>ⓘ</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Romanization below line with toggle */}
          {line.romanization && (
            <View style={styles.romanizationContainer}>
              {!hiddenRomanizationLines.has(line.lineIndex) && (
                <Text style={styles.romanization}>{line.romanization}</Text>
              )}
              <TouchableOpacity
                onPress={() => toggleLineRomanization(line.lineIndex)}
                style={styles.romanizationToggle}
              >
                <Text style={styles.romanizationToggleText}>
                  {hiddenRomanizationLines.has(line.lineIndex) ? '👁️ Show' : '🙈 Hide'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  lineContainer: {
    marginBottom: 20,
  },
  tokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tokenWrapper: {
    marginRight: 1,
  },
  token: {
    fontSize: 18,
    lineHeight: 32,
    color: '#1F2937',
  },
  vocabularyToken: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    textDecorationColor: '#3B82F6',
  },
  grammarButton: {
    marginLeft: 8,
    padding: 4,
  },
  grammarIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  romanizationContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  romanization: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  romanizationToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  romanizationToggleText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
