/**
 * AnalysisStatusBanner
 *
 * Displays the current status of lyrics analysis:
 * - Loading: Analysis in progress
 * - Complete: Shows word count, pattern count
 * - Error: Shows error message with retry button
 * - None: Not available for this language
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AnalysisState } from '../../hooks/useAnalysis';

interface AnalysisStatusBannerProps {
  analysis: AnalysisState;
}

export const AnalysisStatusBanner: React.FC<AnalysisStatusBannerProps> = ({ analysis }) => {
  const { status, vocabulary, grammar, error } = analysis;

  if (status === 'loading') {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading analysis...</Text>
      </View>
    );
  }

  if (status === 'processing') {
    return (
      <View style={[styles.container, styles.processingContainer]}>
        <Text style={styles.processingIcon}>🔄</Text>
        <View style={styles.textContainer}>
          <Text style={styles.processingTitle}>Analyzing lyrics...</Text>
          <Text style={styles.processingSubtitle}>This may take ~10 seconds</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorIcon}>❌</Text>
        <View style={styles.textContainer}>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>{error?.error || 'Unknown error'}</Text>
        </View>
      </View>
    );
  }

  if (status === 'none') {
    return (
      <View style={[styles.container, styles.noneContainer]}>
        <Text style={styles.noneIcon}>ℹ️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.noneTitle}>Analysis not available</Text>
          <Text style={styles.noneText}>Only Korean songs are supported</Text>
        </View>
      </View>
    );
  }

  if (status === 'complete') {
    const wordCount = vocabulary?.words?.length || 0;
    const patternCount = grammar?.patterns?.length || 0;

    return (
      <View style={[styles.container, styles.completeContainer]}>
        <Text style={styles.completeIcon}>✅</Text>
        <View style={styles.textContainer}>
          <Text style={styles.completeTitle}>Analysis Complete</Text>
          <Text style={styles.completeStats}>
            {wordCount} words · {patternCount} patterns
          </Text>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },

  // Loading state
  loadingContainer: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Processing state
  processingContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  processingIcon: {
    fontSize: 24,
  },
  processingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  processingSubtitle: {
    fontSize: 12,
    color: '#B45309',
  },

  // Error state
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  errorIcon: {
    fontSize: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
  },

  // None state
  noneContainer: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  noneIcon: {
    fontSize: 24,
  },
  noneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  noneText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Complete state
  completeContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  completeIcon: {
    fontSize: 24,
  },
  completeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  completeStats: {
    fontSize: 12,
    color: '#047857',
  },
});
