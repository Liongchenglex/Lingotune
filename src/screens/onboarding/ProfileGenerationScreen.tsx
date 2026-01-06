/**
 * ProfileGenerationScreen - AI profile generation loading screen
 *
 * Purpose:
 * - Show loading animation while AI generates profile
 * - Poll Firestore for profile completion status
 * - Navigate to ProfileSummaryScreen when ready
 * - Handle timeout/error scenarios
 *
 * Security: Read-only operations, polling user's own data
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { OnboardingTest } from '../../types/onboarding';

interface ProfileGenerationScreenProps {
  testId: string; // Document ID of the test result
  onComplete: (profile: string, goals: string[]) => void;
  onError: () => void;
}

export const ProfileGenerationScreen: React.FC<ProfileGenerationScreenProps> = ({
  testId,
  onComplete,
  onError,
}) => {
  const { user } = useAuth();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState('Analyzing your responses...');

  /**
   * Poll test document for profile completion
   * Uses Firestore real-time listener for instant updates
   */
  useEffect(() => {
    if (!user || !testId) {
      onError();
      return;
    }

    // Real-time listener on test document
    const unsubscribe = onSnapshot(
      doc(db, 'onboardingTests', testId),
      (snapshot) => {
        if (!snapshot.exists()) {
          console.error('Test document not found');
          onError();
          return;
        }

        const testData = snapshot.data() as OnboardingTest;

        // Check if profile is ready
        if (testData.profileStatus === 'completed' && testData.aiProfile) {
          console.log('Profile ready!');
          onComplete(testData.aiProfile, testData.goals || []);
        } else if (testData.profileStatus === 'failed') {
          console.error('Profile generation failed');
          onError();
        }
        // Otherwise keep waiting (profileStatus === 'pending')
      },
      (error) => {
        console.error('Error listening to test document:', error);
        onError();
      }
    );

    return () => unsubscribe();
  }, [user, testId]);

  /**
   * Timer for elapsed time display
   * Updates message after 30 seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;

        // Update message based on elapsed time
        if (newTime === 30) {
          setMessage('Still analyzing... This is taking a bit longer than usual.');
        } else if (newTime === 60) {
          setMessage('Almost there... Generating your personalized profile.');
        } else if (newTime === 90) {
          setMessage('Thank you for your patience. Finishing up...');
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Format elapsed time (MM:SS)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Loading Animation */}
      <View style={styles.animationContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <View style={styles.pulseCircle} />
      </View>

      {/* Message */}
      <View style={styles.content}>
        <Text style={styles.title}>Creating Your Profile</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Our AI is analyzing your test results to create a personalized learning path just for
          you.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  animationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    maxWidth: 320,
  },
  timer: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    maxWidth: 320,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
