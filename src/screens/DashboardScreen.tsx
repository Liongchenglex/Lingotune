/**
 * DashboardScreen - Main app dashboard after onboarding
 *
 * Purpose:
 * - Exit point for onboarding flow
 * - Shows user's current language(s) and profile
 * - Navigation hub for learning features
 * - Displays onboarding completion status
 *
 * Security: User must be authenticated to access
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { generateProfileForTest } from '../services/profileGeneration';
import type { OnboardingTest, UserLanguage } from '../types/onboarding';

interface DashboardScreenProps {
  onResumeOnboarding?: () => void; // Callback to resume incomplete onboarding
  onAddLanguage?: () => void; // Callback to navigate to language selection
  onViewProfile?: (language: UserLanguage) => void; // Callback to view language profile
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onResumeOnboarding,
  onAddLanguage,
  onViewProfile
}) => {
  const { user, signOut } = useAuth();
  const { userProfile, refreshUserProfile } = useOnboarding();
  const [profileStatuses, setProfileStatuses] = useState<Record<string, 'pending' | 'completed' | 'failed' | 'loading'>>({});
  const [regeneratingLanguage, setRegeneratingLanguage] = useState<string | null>(null); // Track which language is being regenerated
  const [cooldownTimers, setCooldownTimers] = useState<Record<string, number>>({}); // Track cooldown for each language

  // Track completion at LANGUAGE LEVEL (not user.onboardingCompleted)
  const hasCompletedLanguage = userProfile?.languages.some(lang => lang.onboardingStatus === 'completed');
  const hasInProgressOnboarding = !!onResumeOnboarding; // If callback provided, there's incomplete onboarding
  const activeLanguages = userProfile?.languages.filter(
    (lang) => lang.onboardingStatus === 'completed'
  );

  /**
   * Refresh user profile on mount to get latest data from Firestore
   * This ensures we have the updated profile after generation
   */
  useEffect(() => {
    console.log('DashboardScreen - Refreshing user profile on mount');
    refreshUserProfile();
  }, []);

  // Create stable dependency key for useEffect
  // Only depends on userProfile (single reference), not the array
  const languageKey = useMemo(() => {
    if (!userProfile?.languages) return '';
    return userProfile.languages
      .map((l) => `${l.languageCode}-${l.onboardingStatus}-${l.testHistory[l.testHistory.length - 1] || 'none'}`)
      .join('|');
  }, [userProfile]);

  /**
   * Check profile status for each completed language
   *
   * Priority:
   * 1. If language.currentProfile exists → 'completed' (profile is stored in user doc)
   * 2. Otherwise, check onboardingTest.profileStatus (for legacy or pending cases)
   */
  useEffect(() => {
    const checkProfileStatuses = async () => {
      if (!userProfile?.languages || userProfile.languages.length === 0) return;

      const completedLanguages = userProfile.languages.filter(
        (lang) => lang.onboardingStatus === 'completed'
      );

      if (completedLanguages.length === 0) return;

      const statuses: Record<string, 'pending' | 'completed' | 'failed' | 'loading'> = {};

      for (const language of completedLanguages) {
        // Priority 1: Check if profile exists in user document (DRY approach)
        if (language.currentProfile) {
          statuses[language.languageCode] = 'completed';
          console.log(`DashboardScreen - ${language.languageCode}: Profile found in user.languages.currentProfile`);
          continue;
        }

        // Priority 2: Check test document for status (fallback for pending/failed)
        const mostRecentTestId = language.testHistory[language.testHistory.length - 1];

        if (!mostRecentTestId) {
          statuses[language.languageCode] = 'pending';
          continue;
        }

        try {
          const testDoc = await getDoc(doc(db, 'onboardingTests', mostRecentTestId));
          if (testDoc.exists()) {
            const testData = testDoc.data() as OnboardingTest;
            statuses[language.languageCode] = testData.profileStatus;
            console.log(`DashboardScreen - ${language.languageCode}: Status from test document: ${testData.profileStatus}`);
          } else {
            statuses[language.languageCode] = 'pending';
          }
        } catch (error) {
          console.error(`Failed to fetch profile status for ${language.languageCode}:`, error);
          statuses[language.languageCode] = 'pending';
        }
      }

      console.log('DashboardScreen - Final profile statuses:', statuses);
      setProfileStatuses(statuses);
    };

    checkProfileStatuses();
  }, [languageKey]);

  /**
   * Handle cooldown timer countdown
   */
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    Object.keys(cooldownTimers).forEach((languageCode) => {
      if (cooldownTimers[languageCode] > 0) {
        const interval = setInterval(() => {
          setCooldownTimers((prev) => {
            const newTimers = { ...prev };
            if (newTimers[languageCode] > 0) {
              newTimers[languageCode] -= 1;
            } else {
              delete newTimers[languageCode];
            }
            return newTimers;
          });
        }, 1000);
        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach((interval) => clearInterval(interval));
    };
  }, [cooldownTimers]);

  /**
   * Handle profile regeneration with loading state and cooldown
   */
  const handleRegenerateProfile = async (languageCode: string, testId: string) => {
    console.log('DashboardScreen - handleRegenerateProfile called:', { languageCode, testId });

    // Check cooldown
    if (cooldownTimers[languageCode] && cooldownTimers[languageCode] > 0) {
      Alert.alert(
        'Please Wait',
        `You can regenerate again in ${cooldownTimers[languageCode]} seconds.`
      );
      return;
    }

    try {
      // Set loading state
      setRegeneratingLanguage(languageCode);
      setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'loading' }));

      const result = await generateProfileForTest(testId);

      if (result.success && result.profile) {
        console.log('DashboardScreen - Profile regenerated successfully');

        // Update status to completed
        setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'completed' }));

        Alert.alert(
          'Success!',
          'Your profile has been generated successfully.',
          [{ text: 'OK' }]
        );

        // Set 30-second cooldown
        setCooldownTimers((prev) => ({ ...prev, [languageCode]: 30 }));
      } else {
        throw new Error('Invalid response from profile generation');
      }
    } catch (error: any) {
      console.error('DashboardScreen - Failed to regenerate profile:', error);

      // Reset status to failed
      setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'failed' }));

      Alert.alert(
        'Error',
        'Failed to generate profile. Please try again later.',
        [{ text: 'OK' }]
      );

      // Set 20-second cooldown even on failure to prevent spam
      setCooldownTimers((prev) => ({ ...prev, [languageCode]: 20 }));
    } finally {
      setRegeneratingLanguage(null);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Incomplete Onboarding Banner */}
      {hasInProgressOnboarding && (
        <TouchableOpacity
          style={styles.resumeBanner}
          onPress={onResumeOnboarding}
          activeOpacity={0.8}
        >
          <View style={styles.resumeBannerContent}>
            <Text style={styles.resumeBannerIcon}>⏸️</Text>
            <View style={styles.resumeBannerText}>
              <Text style={styles.resumeBannerTitle}>Complete Your Onboarding</Text>
              <Text style={styles.resumeBannerDescription}>
                Resume where you left off and unlock all features
              </Text>
            </View>
            <Text style={styles.resumeBannerArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Onboarding Status Card */}
      {hasCompletedLanguage && (
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>✅</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Onboarding Complete!</Text>
            <Text style={styles.statusDescription}>
              You're ready to start learning. Your personalized learning path is being prepared.
            </Text>
          </View>
        </View>
      )}

      {/* Active Languages */}
      {activeLanguages && activeLanguages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Languages</Text>
          {activeLanguages.map((language) => (
            <View key={language.languageCode} style={styles.languageCard}>
              <View style={styles.languageHeader}>
                <Text style={styles.languageFlag}>
                  {language.languageCode === 'ko' && '🇰🇷'}
                  {language.languageCode === 'zh' && '🇨🇳'}
                  {language.languageCode === 'ja' && '🇯🇵'}
                  {language.languageCode === 'es' && '🇪🇸'}
                </Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>
                    {language.languageCode === 'ko' && 'Korean'}
                    {language.languageCode === 'zh' && 'Chinese'}
                    {language.languageCode === 'ja' && 'Japanese'}
                    {language.languageCode === 'es' && 'Spanish'}
                  </Text>
                  <Text style={styles.languageStatus}>
                    {language.proficiencyLevel || 'Profile being generated...'}
                  </Text>
                </View>
              </View>

              {/* Current Profile (if available) */}
              {language.currentProfile && (
                <View style={styles.profilePreview}>
                  <Text style={styles.profileLabel}>Current Focus:</Text>
                  {language.goals && language.goals.length > 0 && (
                    <View style={styles.goalsContainer}>
                      {language.goals.slice(0, 3).map((goal, index) => (
                        <Text key={index} style={styles.goalItem}>
                          • {goal}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Placeholder if profile not ready */}
              {!language.currentProfile && (
                <View style={styles.profilePending}>
                  <Text style={styles.profilePendingText}>
                    🔄 Your personalized learning profile is being generated...
                  </Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.startButton,
                  hasInProgressOnboarding && styles.startButtonDisabled,
                  (profileStatuses[language.languageCode] === 'pending' || profileStatuses[language.languageCode] === 'failed') && styles.regenerateButton,
                  regeneratingLanguage === language.languageCode && styles.loadingButton
                ]}
                activeOpacity={0.7}
                disabled={hasInProgressOnboarding || regeneratingLanguage === language.languageCode || (cooldownTimers[language.languageCode] && cooldownTimers[language.languageCode] > 0)}
                onPress={() => {
                  console.log('='.repeat(80));
                  console.log('DashboardScreen - Button pressed for language:', language.languageCode);
                  const status = profileStatuses[language.languageCode];
                  console.log('DashboardScreen - Profile status:', status);

                  if (status === 'pending' || status === 'failed' || status === 'loading') {
                    const testId = language.testHistory[language.testHistory.length - 1];
                    console.log('DashboardScreen - Test ID:', testId);
                    if (testId) {
                      console.log('DashboardScreen - Calling handleRegenerateProfile');
                      handleRegenerateProfile(language.languageCode, testId);
                    } else {
                      console.error('DashboardScreen - No test ID found!');
                      Alert.alert('Error', 'No test found for this language.');
                    }
                  } else {
                    // Handle "View Profile" action for completed profiles
                    console.log('DashboardScreen - View Profile pressed');
                    if (onViewProfile) {
                      onViewProfile(language);
                    }
                  }
                  console.log('='.repeat(80));
                }}
              >
                {regeneratingLanguage === language.languageCode ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.startButtonText, styles.loadingText]}>Generating...</Text>
                  </View>
                ) : (
                  <Text style={styles.startButtonText}>
                    {hasInProgressOnboarding
                      ? 'Complete Onboarding First'
                      : cooldownTimers[language.languageCode] && cooldownTimers[language.languageCode] > 0
                      ? `Wait ${cooldownTimers[language.languageCode]}s`
                      : profileStatuses[language.languageCode] === 'pending' || profileStatuses[language.languageCode] === 'failed'
                      ? '🔄 Regenerate Profile'
                      : 'View Profile'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Learn Through Music Section */}
      {hasCompletedLanguage && activeLanguages && activeLanguages.some(lang => lang.currentProfile) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Learn Through Music</Text>

          {activeLanguages
            .filter(lang => lang.currentProfile)
            .map((language) => (
              <View key={`music-${language.languageCode}`} style={styles.musicCard}>
                {/* Language Header */}
                <View style={styles.musicCardHeader}>
                  <Text style={styles.musicLanguageFlag}>
                    {language.languageCode === 'ko' && '🇰🇷'}
                    {language.languageCode === 'zh' && '🇨🇳'}
                    {language.languageCode === 'ja' && '🇯🇵'}
                    {language.languageCode === 'es' && '🇪🇸'}
                  </Text>
                  <Text style={styles.musicLanguageName}>
                    {language.languageCode === 'ko' && 'Korean'}
                    {language.languageCode === 'zh' && 'Chinese'}
                    {language.languageCode === 'ja' && 'Japanese'}
                    {language.languageCode === 'es' && 'Spanish'}
                  </Text>
                </View>

                {/* Empty State - No song selected */}
                {!language.currentSong && (
                  <View style={styles.musicEmptyState}>
                    <Text style={styles.musicEmptyText}>
                      Choose a song to start learning vocabulary
                    </Text>
                    <TouchableOpacity
                      style={styles.chooseSongButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        Alert.alert(
                          'Coming Soon',
                          'Song selection feature will be available soon!'
                        );
                      }}
                    >
                      <Text style={styles.chooseSongButtonText}>+ Choose Song</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Active State - Song selected */}
                {language.currentSong && (
                  <View style={styles.musicActiveState}>
                    <View style={styles.currentSongInfo}>
                      <Text style={styles.currentSongIcon}>🎵</Text>
                      <View style={styles.currentSongText}>
                        <Text style={styles.currentSongTitle}>{language.currentSong.title}</Text>
                        <Text style={styles.currentSongArtist}>{language.currentSong.artist}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.chooseSongButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        Alert.alert(
                          'Coming Soon',
                          'Song selection feature will be available soon!'
                        );
                      }}
                    >
                      <Text style={styles.chooseSongButtonText}>+ Choose Another Song</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
        </View>
      )}

      {/* Coming Soon Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Soon</Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📚</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Lessons & Vocabulary</Text>
            <Text style={styles.featureDescription}>
              Structured lessons based on your proficiency level
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🎯</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Progress Tracking</Text>
            <Text style={styles.featureDescription}>
              Track your learning journey and celebrate milestones
            </Text>
          </View>
        </View>
      </View>

      {/* Add Another Language */}
      <TouchableOpacity
        style={styles.addLanguageButton}
        activeOpacity={0.7}
        onPress={onAddLanguage}
      >
        <Text style={styles.addLanguageText}>+ Add Another Language</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>LingoTune v1.0</Text>
        <Text style={styles.footerText}>Learn languages through music</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  resumeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  resumeBannerText: {
    flex: 1,
  },
  resumeBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  resumeBannerDescription: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 18,
  },
  resumeBannerArrow: {
    fontSize: 24,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageFlag: {
    fontSize: 40,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  languageStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  profilePreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  goalsContainer: {
    marginTop: 4,
  },
  goalItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  profilePending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  profilePendingText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  regenerateButton: {
    backgroundColor: '#F59E0B', // Orange color for regenerate action
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButton: {
    backgroundColor: '#D97706', // Darker orange for loading state
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    marginLeft: 8,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  // Music Selection Section Styles
  musicCard: {
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
  musicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  musicLanguageFlag: {
    fontSize: 24,
    marginRight: 8,
  },
  musicLanguageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  musicEmptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  musicEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  musicActiveState: {
    paddingVertical: 8,
  },
  currentSongInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  currentSongIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  currentSongText: {
    flex: 1,
  },
  currentSongTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  currentSongArtist: {
    fontSize: 13,
    color: '#6B7280',
  },
  chooseSongButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chooseSongButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  addLanguageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addLanguageText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
});
