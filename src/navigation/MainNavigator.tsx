/**
 * MainNavigator - Routes between onboarding and main app
 *
 * Purpose:
 * - Checks if user has completed onboarding
 * - Routes to onboarding flow if not completed
 * - Routes to dashboard if completed
 * - Handles navigation between onboarding screens
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import LoadingScreen from '../components/LoadingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { LanguageSelectionScreen } from '../screens/onboarding/LanguageSelectionScreen';
import { TestConfirmationScreen } from '../screens/onboarding/TestConfirmationScreen';
import { TestScreen } from '../screens/onboarding/TestScreen';
import { ProfileGenerationScreen } from '../screens/onboarding/ProfileGenerationScreen';
import { ProfileSummaryScreen } from '../screens/onboarding/ProfileSummaryScreen';
import type { OnboardingScreen, LanguageCode } from '../types/onboarding';

export default function MainNavigator() {
  const { user } = useAuth();
  const { userProfile, loading } = useOnboarding();
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>('welcome');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [aiProfile, setAiProfile] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  // Check if user has completed onboarding for any language
  const hasCompletedOnboarding = userProfile?.onboardingCompleted || false;

  // If user has completed onboarding, show dashboard
  if (hasCompletedOnboarding) {
    return <DashboardScreen />;
  }

  // Otherwise, show onboarding flow based on current screen
  switch (currentScreen) {
    case 'welcome':
      return <WelcomeScreen onContinue={() => setCurrentScreen('language-selection')} />;

    case 'language-selection':
      return <LanguageSelectionScreen onContinue={() => setCurrentScreen('test-confirmation')} />;

    case 'test-confirmation':
      return <TestConfirmationScreen onStartTest={() => setCurrentScreen('test')} />;

    case 'test':
      if (!selectedLanguage) {
        // Get selected language from context
        const currentLanguage = userProfile?.languages.find(
          (l) => l.onboardingStatus === 'in_progress'
        );
        if (currentLanguage) {
          setSelectedLanguage(currentLanguage.languageCode);
        }
      }

      return (
        <TestScreen
          language={selectedLanguage || 'ko'}
          onComplete={() => {
            // TestScreen handles saving the test and getting testId internally
            // For now, we'll navigate to profile generation
            // The ProfileGenerationScreen will find the most recent test
            setCurrentScreen('profile-generation');
          }}
        />
      );

    case 'profile-generation':
      // Get the most recent test ID from the user's test history
      const recentTestId = userProfile?.languages.find(
        (l) => l.onboardingStatus === 'in_progress'
      )?.testHistory[0];

      return (
        <ProfileGenerationScreen
          testId={testId || recentTestId || ''}
          onComplete={(profile, generatedGoals) => {
            setAiProfile(profile);
            setGoals(generatedGoals);
            setCurrentScreen('profile-summary');
          }}
          onError={() => {
            // On error, reset to welcome (could show error message)
            setCurrentScreen('welcome');
          }}
        />
      );

    case 'profile-summary':
      const languageMap: Record<LanguageCode, string> = {
        ko: 'Korean',
        zh: 'Chinese',
        ja: 'Japanese',
        es: 'Spanish'
      };

      return (
        <ProfileSummaryScreen
          profile={aiProfile || ''}
          goals={goals}
          languageName={selectedLanguage ? languageMap[selectedLanguage] : 'Korean'}
          onStartLearning={() => {
            // onStartLearning in ProfileSummaryScreen should mark onboarding complete
            // Context will update and re-render showing dashboard
            setCurrentScreen('welcome'); // Reset for next time
          }}
        />
      );

    default:
      return <WelcomeScreen onContinue={() => setCurrentScreen('language-selection')} />;
  }
}
