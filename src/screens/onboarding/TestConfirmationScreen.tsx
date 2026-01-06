/**
 * TestConfirmationScreen - Explain diagnostic test before starting
 *
 * Purpose:
 * - Display motivational copy about the test
 * - Explain purpose (diagnostic, not evaluation)
 * - Encourage user ("It's okay to get answers wrong")
 * - "Start Test" button to begin
 *
 * Security: No sensitive operations, just navigation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface TestConfirmationScreenProps {
  onStartTest: () => void;
}

export const TestConfirmationScreen: React.FC<TestConfirmationScreenProps> = ({ onStartTest }) => {
  const { updateCurrentScreen } = useOnboarding();

  /**
   * Save current screen on mount (for resume functionality)
   */
  useEffect(() => {
    updateCurrentScreen('test_confirmation').catch((err) => {
      console.warn('Failed to update current screen:', err);
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Icon/Illustration */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📋</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostic Test</Text>
        <Text style={styles.subtitle}>Let's assess your current level</Text>
      </View>

      {/* Key Points */}
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🎯</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Personalized Learning</Text>
            <Text style={styles.infoDescription}>
              This test helps us create your personalized learning path based on your current
              knowledge.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✨</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>It's Okay to Be Wrong</Text>
            <Text style={styles.infoDescription}>
              Don't worry if you don't know some answers. This is a diagnostic, not an evaluation.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔄</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Adaptive Testing</Text>
            <Text style={styles.infoDescription}>
              The test adapts to your level. If some questions seem too easy or hard, that's
              working as intended!
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>10-15 Minutes</Text>
            <Text style={styles.infoDescription}>
              The test takes about 10-15 minutes. You can pause and resume anytime.
            </Text>
          </View>
        </View>
      </View>

      {/* Start Test Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={onStartTest}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Start Test</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Remember: There are no wrong answers, only learning opportunities!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
