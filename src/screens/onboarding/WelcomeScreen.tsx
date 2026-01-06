/**
 * WelcomeScreen - First screen in onboarding flow
 *
 * Purpose:
 * - Welcome message with app branding
 * - "Get Started" button to begin onboarding
 * - Updates currentScreen in Firestore for resume functionality
 *
 * Security: No sensitive operations, just navigation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { updateCurrentScreen } = useOnboarding();

  /**
   * Save current screen on mount (for resume functionality)
   * Non-blocking: If fails, user can still proceed
   */
  useEffect(() => {
    updateCurrentScreen('welcome').catch((err) => {
      console.warn('Failed to update current screen:', err);
      // Non-blocking error, continue anyway
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* App Branding */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎵 LingoTune</Text>
        <Text style={styles.tagline}>Learn languages through music</Text>
      </View>

      {/* Welcome Message */}
      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.description}>
          Let's start by understanding your current language level.
        </Text>
        <Text style={styles.description}>
          This quick diagnostic test will help us create your personalized learning path.
        </Text>
      </View>

      {/* Get Started Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={onContinue} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  footer: {
    marginBottom: 40,
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
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
