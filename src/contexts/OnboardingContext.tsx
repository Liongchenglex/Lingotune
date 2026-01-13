/**
 * OnboardingContext - Global state management for onboarding feature
 *
 * This context manages:
 * - User onboarding status
 * - Current language being onboarded
 * - Progress through onboarding flow
 * - Firestore synchronization
 *
 * Security: All Firestore writes validate userId matches auth.uid
 * Pattern: Follows existing AuthContext.tsx pattern
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
  collection,
  deleteField,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import type {
  OnboardingContextValue,
  UserProfile,
  UserLanguage,
  LanguageCode,
  OnboardingScreen,
  TempAnswer,
  OnboardingTest,
  UserError,
} from '../types/onboarding';

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<UserLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UserError | null>(null);

  /**
   * Load user profile from Firestore on mount
   * Sets up real-time listener for profile updates
   */
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setCurrentLanguage(null);
      setLoading(false);
      return;
    }

    const loadUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;

          // Initialize onboarding fields if they don't exist (migration support)
          const profile: UserProfile = {
            ...data,
            onboardingCompleted: data.onboardingCompleted ?? false,
            languages: data.languages ?? [],
          };

          // If fields were missing, update Firestore to persist them
          if (data.onboardingCompleted === undefined || data.languages === undefined) {
            await updateDoc(doc(db, 'users', user.uid), {
              onboardingCompleted: profile.onboardingCompleted,
              languages: profile.languages,
              updatedAt: serverTimestamp(),
            });
          }

          setUserProfile(profile);

          // Set current language if there's one in progress
          const inProgressLanguage = profile.languages.find(
            (lang) => lang.onboardingStatus === 'in_progress'
          );
          setCurrentLanguage(inProgressLanguage || null);
        } else {
          // User document doesn't exist - create it with onboarding fields
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            onboardingCompleted: false,
            languages: [],
          };

          await setDoc(doc(db, 'users', user.uid), newProfile);
          setUserProfile(newProfile);
        }
      } catch (err: any) {
        console.error('Failed to load user profile:', err);
        setError({
          message: 'Unable to load your profile. Please try again.',
          action: 'Retry',
          actionCallback: () => loadUserProfile(),
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  /**
   * Start onboarding for a new language
   *
   * Security: Only allows user to onboard their own account
   * Creates or updates language entry in user.languages array
   */
  const startOnboarding = async (languageCode: LanguageCode): Promise<void> => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to start onboarding');
    }

    try {
      // Check if language already exists
      const existingLanguageIndex = userProfile.languages.findIndex(
        (lang) => lang.languageCode === languageCode
      );

      let updatedLanguages: UserLanguage[];

      if (existingLanguageIndex >= 0) {
        // Update existing language entry - reset to initial state
        const existingLang = userProfile.languages[existingLanguageIndex];
        updatedLanguages = [...userProfile.languages];
        updatedLanguages[existingLanguageIndex] = {
          languageCode: existingLang.languageCode,
          onboardingStatus: 'in_progress',
          currentScreen: 'welcome',
          testHistory: existingLang.testHistory || [],
          lastUpdated: Timestamp.now(),
          // Omit currentQuestionIndex and tempAnswers to avoid undefined values
        };
      } else {
        // Add new language entry
        const newLanguage: UserLanguage = {
          languageCode,
          onboardingStatus: 'in_progress',
          currentScreen: 'welcome',
          testHistory: [],
          lastUpdated: Timestamp.now(),
          // Omit optional fields to avoid undefined values
        };
        updatedLanguages = [...userProfile.languages, newLanguage];
      }

      // Update Firestore (security rules enforce userId match)
      await updateDoc(doc(db, 'users', user.uid), {
        languages: updatedLanguages,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        languages: updatedLanguages,
      });

      setCurrentLanguage(
        updatedLanguages.find((lang) => lang.languageCode === languageCode) || null
      );
    } catch (err: any) {
      console.error('Failed to start onboarding:', err);
      throw new Error('Unable to start onboarding. Please try again.');
    }
  };

  /**
   * Update current screen in onboarding flow
   *
   * Security: Only allows user to update their own profile
   * Used for resume functionality (saves last screen visited)
   */
  const updateCurrentScreen = async (screen: OnboardingScreen): Promise<void> => {
    if (!user || !userProfile || !currentLanguage) {
      throw new Error('No active onboarding session');
    }

    try {
      const updatedLanguages = userProfile.languages.map((lang) =>
        lang.languageCode === currentLanguage.languageCode
          ? {
              ...lang,
              currentScreen: screen,
              lastUpdated: Timestamp.now(),
            }
          : lang
      );

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        languages: updatedLanguages,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        languages: updatedLanguages,
      });

      setCurrentLanguage(
        updatedLanguages.find((lang) => lang.languageCode === currentLanguage.languageCode) || null
      );
    } catch (err: any) {
      console.error('Failed to update current screen:', err);
      // Non-blocking error (resume will still work from previous screen)
    }
  };

  /**
   * Save test progress (for resume functionality)
   *
   * Security: Only allows user to update their own profile
   * Stores current question index and answers so far
   */
  const saveTestProgress = async (
    questionIndex: number,
    answers: TempAnswer[]
  ): Promise<void> => {
    if (!user || !userProfile || !currentLanguage) {
      throw new Error('No active onboarding session');
    }

    try {
      const updatedLanguages = userProfile.languages.map((lang) =>
        lang.languageCode === currentLanguage.languageCode
          ? {
              ...lang,
              currentScreen: 'test' as OnboardingScreen,
              currentQuestionIndex: questionIndex,
              tempAnswers: answers,
              lastUpdated: Timestamp.now(),
            }
          : lang
      );

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        languages: updatedLanguages,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        languages: updatedLanguages,
      });

      setCurrentLanguage(
        updatedLanguages.find((lang) => lang.languageCode === currentLanguage.languageCode) || null
      );
    } catch (err: any) {
      console.error('Failed to save test progress:', err);
      // Non-blocking error (AsyncStorage backup will be used)
    }
  };

  /**
   * Complete test and save results to Firestore
   *
   * Security:
   * - Only allows user to create test result for their own account
   * - Test result includes userId which Firestore rules will validate
   * - Clears temporary progress data after successful save
   */
  const completeTest = async (
    testData: Omit<OnboardingTest, 'testId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    console.log('='.repeat(80));
    console.log('completeTest - START');
    console.log('completeTest - user:', user?.uid);
    console.log('completeTest - userProfile:', userProfile?.uid);
    console.log('completeTest - currentLanguage:', currentLanguage?.languageCode);

    if (!user || !userProfile || !currentLanguage) {
      console.error('completeTest - Missing required data!');
      throw new Error('No active onboarding session');
    }

    try {
      console.log('completeTest - Creating test result document...');
      // Create test result document
      const testResult: Omit<OnboardingTest, 'testId'> = {
        ...testData,
        userId: user.uid, // Security: Ensure userId matches authenticated user
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const testDocRef = await addDoc(collection(db, 'onboardingTests'), testResult);
      console.log('completeTest - Test document created:', testDocRef.id);

      // Update user profile: mark onboarding complete at LANGUAGE LEVEL, clear temp data
      console.log('completeTest - Current languages BEFORE update:', JSON.stringify(userProfile.languages, null, 2));

      const updatedLanguages = userProfile.languages.map((lang) => {
        if (lang.languageCode === currentLanguage.languageCode) {
          console.log('completeTest - Updating language:', lang.languageCode);
          console.log('completeTest - Old status:', lang.onboardingStatus);
          // Remove optional fields to avoid undefined values
          const { currentScreen, currentQuestionIndex, tempAnswers, ...rest } = lang;
          const updated = {
            ...rest,
            onboardingStatus: 'completed' as const,
            testHistory: [...lang.testHistory, testDocRef.id],
            lastUpdated: Timestamp.now(),
          };
          console.log('completeTest - New status:', updated.onboardingStatus);
          return updated;
        }
        return lang;
      });

      console.log('completeTest - Updated languages AFTER map:', JSON.stringify(updatedLanguages, null, 2));

      // Update Firestore (track completion at LANGUAGE LEVEL only)
      console.log('completeTest - Updating Firestore...');
      await updateDoc(doc(db, 'users', user.uid), {
        languages: updatedLanguages,
        updatedAt: serverTimestamp(),
      });
      console.log('completeTest - Firestore updated successfully!');

      // Update local state
      console.log('completeTest - Updating local state...');
      setUserProfile({
        ...userProfile,
        languages: updatedLanguages,
      });
      console.log('completeTest - Local state updated!');

      setCurrentLanguage(null); // Clear current language (onboarding complete)
      console.log('completeTest - COMPLETE');
      console.log('='.repeat(80));
    } catch (err: any) {
      console.error('completeTest - ERROR:', err);
      console.error('completeTest - Error stack:', err.stack);
      throw new Error('Unable to save your test results. Please try again.');
    }
  };

  /**
   * Check if user has completed onboarding
   */
  const checkOnboardingStatus = (): boolean => {
    return userProfile?.onboardingCompleted ?? false;
  };

  /**
   * Get current language data
   */
  const getCurrentLanguageData = (): UserLanguage | null => {
    return currentLanguage;
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Refresh user profile from Firestore
   * Useful after profile generation or other background updates
   */
  const refreshUserProfile = async (): Promise<void> => {
    if (!user) {
      console.warn('refreshUserProfile - No user logged in');
      return;
    }

    try {
      console.log('refreshUserProfile - Fetching latest user profile from Firestore');
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        const profile: UserProfile = {
          ...data,
          onboardingCompleted: data.onboardingCompleted ?? false,
          languages: data.languages ?? [],
        };

        setUserProfile(profile);
        console.log('refreshUserProfile - Profile updated successfully');
      } else {
        console.warn('refreshUserProfile - User document not found');
      }
    } catch (err: any) {
      console.error('refreshUserProfile - Failed to refresh:', err);
    }
  };

  const value: OnboardingContextValue = {
    userProfile,
    currentLanguage,
    loading,
    error,
    startOnboarding,
    updateCurrentScreen,
    saveTestProgress,
    completeTest,
    checkOnboardingStatus,
    getCurrentLanguageData,
    clearError,
    refreshUserProfile,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

/**
 * Hook to use OnboardingContext
 *
 * Throws error if used outside OnboardingProvider (matches AuthContext pattern)
 */
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
