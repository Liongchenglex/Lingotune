/**
 * ProfileViewScreen - Display full user profile for a language
 *
 * Purpose:
 * - Show complete AI-generated profile
 * - Display learning goals
 * - Show proficiency level
 * - Navigate back to dashboard
 *
 * Security: User must be authenticated to access
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { UserLanguage } from '../types/onboarding';

interface ProfileViewScreenProps {
  language: UserLanguage;
  languageName: string;
  onBack: () => void; // Navigate back to dashboard
}

export const ProfileViewScreen: React.FC<ProfileViewScreenProps> = ({
  language,
  languageName,
  onBack
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Language Info */}
      <View style={styles.languageHeader}>
        <Text style={styles.languageFlag}>
          {language.languageCode === 'ko' && '🇰🇷'}
          {language.languageCode === 'zh' && '🇨🇳'}
          {language.languageCode === 'ja' && '🇯🇵'}
          {language.languageCode === 'es' && '🇪🇸'}
        </Text>
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{languageName}</Text>
          <Text style={styles.proficiencyLevel}>
            {language.proficiencyLevel || 'Proficiency Level'}
          </Text>
        </View>
      </View>

      {/* Full Profile */}
      {language.currentProfile ? (
        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Your Learning Profile</Text>
          <Text style={styles.profileText}>{language.currentProfile}</Text>
        </View>
      ) : (
        <View style={styles.noProfileCard}>
          <Text style={styles.noProfileText}>
            Profile not available. Please regenerate from the dashboard.
          </Text>
        </View>
      )}

      {/* Learning Goals */}
      {language.goals && language.goals.length > 0 && (
        <View style={styles.goalsCard}>
          <Text style={styles.sectionTitle}>Recommended Focus Areas</Text>
          <Text style={styles.goalsDescription}>
            Based on your test results, here are the areas to focus on:
          </Text>
          {language.goals.map((goal, index) => (
            <View key={index} style={styles.goalItem}>
              <View style={styles.goalNumber}>
                <Text style={styles.goalNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.goalText}>{goal}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Last Updated */}
      {language.lastUpdated && (
        <Text style={styles.lastUpdated}>
          Profile last updated: {new Date(language.lastUpdated.seconds * 1000).toLocaleDateString()}
        </Text>
      )}
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
    marginBottom: 24,
    marginTop: 20,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  languageFlag: {
    fontSize: 64,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  proficiencyLevel: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noProfileCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  noProfileText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  profileText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  goalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalsDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  goalItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  goalNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  goalNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
