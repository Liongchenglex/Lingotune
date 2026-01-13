/**
 * MainNavigator - Routes between onboarding and main app
 *
 * Purpose:
 * - Checks if user has completed onboarding
 * - Routes to onboarding flow if not completed
 * - Routes to dashboard if completed
 * - Handles navigation between onboarding screens
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import LoadingScreen from '../components/LoadingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProfileViewScreen } from '../screens/ProfileViewScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { LanguageSelectionScreen } from '../screens/onboarding/LanguageSelectionScreen';
import { TestConfirmationScreen } from '../screens/onboarding/TestConfirmationScreen';
import { TestScreen } from '../screens/onboarding/TestScreen';
import { ProfileGenerationScreen } from '../screens/onboarding/ProfileGenerationScreen';
import { ProfileSummaryScreen } from '../screens/onboarding/ProfileSummaryScreen';
import type { OnboardingScreen, LanguageCode, UserLanguage } from '../types/onboarding';

export default function MainNavigator() {
  const { user } = useAuth();
  const { userProfile, loading, currentLanguage } = useOnboarding();
  const [showingOnboarding, setShowingOnboarding] = useState(false);
  const [showingProfile, setShowingProfile] = useState(false);
  const [viewingLanguage, setViewingLanguage] = useState<UserLanguage | null>(null);
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>('welcome');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [aiProfile, setAiProfile] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  // SIMPLE MVP LOGIC:
  // - No languages started (length === 0) → Welcome Screen
  // - Has language(s) (length >= 1) → Dashboard
  // Track completion at LANGUAGE LEVEL (not user.onboardingCompleted)
  const hasNoLanguages = !userProfile?.languages || userProfile.languages.length === 0;
  const hasInProgressOnboarding = currentLanguage && currentLanguage.onboardingStatus === 'in_progress';
  const hasCompletedLanguage = userProfile?.languages.some(lang => lang.onboardingStatus === 'completed');

  console.log('MainNavigator - languages count:', userProfile?.languages?.length || 0);
  console.log('MainNavigator - hasNoLanguages:', hasNoLanguages);
  console.log('MainNavigator - hasInProgressOnboarding:', hasInProgressOnboarding);
  console.log('MainNavigator - hasCompletedLanguage:', hasCompletedLanguage);
  console.log('MainNavigator - showingOnboarding:', showingOnboarding);

  // Handle starting/restarting onboarding
  const handleStartOnboarding = () => {
    // If user already has a language, skip welcome/language selection and go straight to test
    if (currentLanguage) {
      setSelectedLanguage(currentLanguage.languageCode);
      setCurrentScreen('test');
    } else {
      setCurrentScreen('welcome');
    }
    setShowingOnboarding(true);
  };

  // Handle starting onboarding for a new language
  const handleStartNewLanguage = () => {
    setCurrentScreen('language-selection');
    setSelectedLanguage(null);
    setShowingOnboarding(true);
  };


  // NEW USER: No languages started → Show Welcome Screen
  if (!showingOnboarding && hasNoLanguages) {
    console.log('MainNavigator - Showing Welcome Screen (new user, no languages)');
    return <WelcomeScreen onContinue={() => {
      setCurrentScreen('language-selection');
      setShowingOnboarding(true);
    }} />;
  }

  // PROFILE VIEW: User is viewing a specific language profile
  if (showingProfile && viewingLanguage) {
    console.log('MainNavigator - Showing Profile View');
    const languageNameMap: Record<string, string> = {
      ko: 'Korean',
      zh: 'Chinese',
      ja: 'Japanese',
      es: 'Spanish'
    };
    return (
      <ProfileViewScreen
        language={viewingLanguage}
        languageName={languageNameMap[viewingLanguage.languageCode] || viewingLanguage.languageCode}
        onBack={() => {
          setShowingProfile(false);
          setViewingLanguage(null);
        }}
      />
    );
  }

  // EXISTING USER: Has languages → Show Dashboard
  if (!showingOnboarding) {
    console.log('MainNavigator - Showing Dashboard (showingOnboarding=false, has languages)');
    return (
      <DashboardScreen
        onResumeOnboarding={hasInProgressOnboarding ? handleStartOnboarding : undefined}
        onAddLanguage={handleStartNewLanguage}
        onViewProfile={(language) => {
          setViewingLanguage(language);
          setShowingProfile(true);
        }}
      />
    );
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
      // After completeTest(), the language status is 'completed', so find the most recent completed language
      console.log('profile-generation - Looking for test ID');
      console.log('profile-generation - userProfile.languages:', JSON.stringify(userProfile?.languages, null, 2));

      const recentLanguage = userProfile?.languages
        .filter((l) => l.testHistory && l.testHistory.length > 0)
        .sort((a, b) => {
          // Sort by lastUpdated, most recent first
          const aTime = a.lastUpdated?.seconds || 0;
          const bTime = b.lastUpdated?.seconds || 0;
          return bTime - aTime;
        })[0];

      const recentTestId = recentLanguage?.testHistory[recentLanguage.testHistory.length - 1];

      console.log('profile-generation - Found recent language:', recentLanguage?.languageCode);
      console.log('profile-generation - Recent test ID:', recentTestId);

      return (
        <ProfileGenerationScreen
          testId={testId || recentTestId || ''}
          onComplete={(profile, generatedGoals) => {
            setAiProfile(profile);
            setGoals(generatedGoals);
            setCurrentScreen('profile-summary');
          }}
          onError={() => {
            // On error, go to dashboard (user can retry from there)
            console.error('ProfileGenerationScreen error - going to dashboard');
            setShowingOnboarding(false);
            setCurrentScreen('welcome'); // Reset for next time
          }}
          onSkip={() => {
            // User chose to skip waiting - go to dashboard
            console.log('ProfileGenerationScreen - User skipped to dashboard');
            setShowingOnboarding(false);
            setCurrentScreen('welcome'); // Reset for next time
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
            // Return to dashboard after completing onboarding
            console.log('='.repeat(80));
            console.log('ProfileSummary - onStartLearning called');
            console.log('ProfileSummary - userProfile:', userProfile?.uid);
            console.log('ProfileSummary - userProfile.languages:', userProfile?.languages.length);
            console.log('ProfileSummary - languages array:', JSON.stringify(userProfile?.languages, null, 2));
            console.log('ProfileSummary - hasNoLanguages:', hasNoLanguages);
            console.log('ProfileSummary - SETTING showingOnboarding to FALSE');
            console.log('='.repeat(80));
            setShowingOnboarding(false);
            setCurrentScreen('welcome'); // Reset for next time
          }}
        />
      );

    default:
      return <WelcomeScreen onContinue={() => setCurrentScreen('language-selection')} />;
  }
}
