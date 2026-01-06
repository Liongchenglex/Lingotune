/**
 * ProfileSummaryScreen - Display AI-generated profile summary
 *
 * Purpose:
 * - Show AI-generated learning profile to user
 * - Highlight recommended focus areas (goals)
 * - Provide "Start Learning" action to navigate to Dashboard
 * - Mark this language's onboarding as complete
 *
 * Security: Read-only display of user's own data
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface ProfileSummaryScreenProps {
  profile: string; // AI-generated profile text
  goals: string[]; // Recommended focus areas
  languageName: string; // Display name (e.g., "Korean")
  onStartLearning: () => void; // Navigate to dashboard
}

export const ProfileSummaryScreen: React.FC<ProfileSummaryScreenProps> = ({
  profile,
  goals,
  languageName,
  onStartLearning,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎉</Text>
        <Text style={styles.title}>Your {languageName} Profile is Ready!</Text>
        <Text style={styles.subtitle}>
          Based on your test results, we've created a personalized learning path for you.
        </Text>
      </View>

      {/* AI-Generated Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Learning Profile</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileText}>{profile}</Text>
        </View>
      </View>

      {/* Recommended Focus Areas (Goals) */}
      {goals && goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Focus Areas</Text>
          <View style={styles.goalsCard}>
            {goals.map((goal, index) => (
              <View key={index} style={styles.goalItem}>
                <View style={styles.goalBullet}>
                  <Text style={styles.goalBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Your profile will guide your learning journey. You can always add more languages or
          retake the test to update your profile.
        </Text>
      </View>

      {/* Start Learning Button */}
      <TouchableOpacity
        style={styles.startButton}
        activeOpacity={0.8}
        onPress={onStartLearning}
      >
        <Text style={styles.startButtonText}>Start Learning</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ready to begin your {languageName} learning adventure!
        </Text>
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
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  goalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  goalBulletText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  goalText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
