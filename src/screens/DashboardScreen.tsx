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

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';

export const DashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { userProfile, checkOnboardingStatus } = useOnboarding();

  const isOnboardingComplete = checkOnboardingStatus();
  const activeLanguages = userProfile?.languages.filter(
    (lang) => lang.onboardingStatus === 'completed'
  );

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

      {/* Onboarding Status Card */}
      {isOnboardingComplete && (
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
              <TouchableOpacity style={styles.startButton} activeOpacity={0.7}>
                <Text style={styles.startButtonText}>Start Learning</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Coming Soon Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Soon</Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🎵</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Learn Through Music</Text>
            <Text style={styles.featureDescription}>
              Discover K-pop lyrics and learn Korean through your favorite songs
            </Text>
          </View>
        </View>

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
      <TouchableOpacity style={styles.addLanguageButton} activeOpacity={0.7}>
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
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
