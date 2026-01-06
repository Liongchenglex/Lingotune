/**
 * LanguageSelectionScreen - Select language for onboarding
 *
 * Purpose:
 * - Display available languages as cards
 * - Single selection (radio button behavior)
 * - "Continue" button (disabled until selection)
 * - Calls startOnboarding() with selected language
 *
 * Security: Validates language selection before proceeding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validateLanguageSelection } from '../../utils/onboardingValidation';
import type { LanguageCode } from '../../types/onboarding';

interface LanguageSelectionScreenProps {
  onContinue: () => void;
}

interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  available: boolean;
}

const LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', available: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', available: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', available: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', available: false },
];

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onContinue }) => {
  const { updateCurrentScreen, startOnboarding } = useOnboarding();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Save current screen on mount (for resume functionality)
   */
  useEffect(() => {
    updateCurrentScreen('language_selection').catch((err) => {
      console.warn('Failed to update current screen:', err);
    });
  }, []);

  /**
   * Handle language selection
   * Only allows selecting available languages
   */
  const handleLanguageSelect = (code: LanguageCode) => {
    const language = LANGUAGES.find((lang) => lang.code === code);
    if (!language?.available) {
      setError('This language is not available yet');
      return;
    }

    setSelectedLanguage(code);
    setError(null);
  };

  /**
   * Handle continue button press
   * Validates selection and calls startOnboarding
   */
  const handleContinue = async () => {
    // Validate selection
    const validation = validateLanguageSelection(selectedLanguage);
    if (!validation.isValid) {
      setError(validation.error || 'Please select a language');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Start onboarding for selected language
      await startOnboarding(selectedLanguage!);
      onContinue();
    } catch (err: any) {
      console.error('Failed to start onboarding:', err);
      setError(err.message || 'Unable to start onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Language</Text>
        <Text style={styles.subtitle}>
          Select the language you want to learn. You can add more languages later.
        </Text>
      </View>

      {/* Language Cards */}
      <View style={styles.languagesContainer}>
        {LANGUAGES.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageCard,
              selectedLanguage === language.code && styles.languageCardSelected,
              !language.available && styles.languageCardDisabled,
            ]}
            onPress={() => handleLanguageSelect(language.code)}
            disabled={!language.available || loading}
            activeOpacity={0.7}
          >
            {/* Flag */}
            <Text style={styles.flag}>{language.flag}</Text>

            {/* Language Name */}
            <View style={styles.languageInfo}>
              <Text
                style={[
                  styles.languageName,
                  !language.available && styles.languageNameDisabled,
                ]}
              >
                {language.name}
              </Text>
              <Text
                style={[
                  styles.nativeName,
                  !language.available && styles.nativeNameDisabled,
                ]}
              >
                {language.nativeName}
              </Text>
            </View>

            {/* Selection Indicator */}
            {selectedLanguage === language.code && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}

            {/* Coming Soon Badge */}
            {!language.available && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Coming Soon</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!selectedLanguage || loading) && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedLanguage || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Continue'}
          </Text>
        </TouchableOpacity>
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
  header: {
    marginTop: 20,
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
    lineHeight: 24,
  },
  languagesContainer: {
    marginBottom: 24,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  languageCardDisabled: {
    opacity: 0.6,
  },
  flag: {
    fontSize: 40,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  languageNameDisabled: {
    color: '#9CA3AF',
  },
  nativeName: {
    fontSize: 14,
    color: '#6B7280',
  },
  nativeNameDisabled: {
    color: '#D1D5DB',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
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
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
